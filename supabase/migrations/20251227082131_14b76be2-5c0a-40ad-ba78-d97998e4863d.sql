-- Fix lead visibility RLS: unassigned leads visible to all, assigned only to assignee

-- Drop existing SELECT policy for leads
DROP POLICY IF EXISTS "Users can view leads for their locations" ON public.leads;

-- Create new SELECT policy:
-- - Admins can see all leads
-- - Users can see leads assigned to them
-- - Users can see unassigned leads (assigned_to IS NULL) for their locations
CREATE POLICY "Users can view accessible leads" 
ON public.leads 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR assigned_to = auth.uid()
  OR (assigned_to IS NULL AND location_id IS NOT NULL AND user_has_location_access(auth.uid(), location_id))
  OR (assigned_to IS NULL AND location_id IS NULL)
);

-- Update the UPDATE policy to also respect the new visibility rules
DROP POLICY IF EXISTS "Users can update leads they have access to" ON public.leads;

CREATE POLICY "Users can update accessible leads" 
ON public.leads 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR assigned_to = auth.uid()
  OR (assigned_to IS NULL AND location_id IS NOT NULL AND user_has_location_access(auth.uid(), location_id))
);

-- Add extended roles enum (pre_sales, sales, user, admin)
-- First check if the type exists and add new values if needed
DO $$ 
BEGIN
  -- Add pre_sales if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pre_sales' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'pre_sales';
  END IF;
  -- Add sales if not exists  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sales' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'sales';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create lead assignment history table for tracking handoffs
CREATE TABLE IF NOT EXISTS public.lead_assignment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_from UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assignment history
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment history
CREATE POLICY "Users can view assignment history for accessible leads"
ON public.lead_assignment_history
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_from = auth.uid()
  OR assigned_to = auth.uid()
  OR assigned_by = auth.uid()
);

CREATE POLICY "Authenticated users can create assignment history"
ON public.lead_assignment_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger to log lead assignments
CREATE OR REPLACE FUNCTION public.log_lead_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.lead_assignment_history (lead_id, assigned_from, assigned_to, assigned_by)
    VALUES (NEW.id, OLD.assigned_to, NEW.assigned_to, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS log_lead_assignment_trigger ON public.leads;
CREATE TRIGGER log_lead_assignment_trigger
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_assignment();

-- Ensure meetings RLS allows viewing for participants and schedulers properly
DROP POLICY IF EXISTS "Users can view meetings they participate in" ON public.meetings;
CREATE POLICY "Users can view accessible meetings"
ON public.meetings
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR scheduled_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM meeting_participants 
    WHERE meeting_participants.meeting_id = meetings.id 
    AND meeting_participants.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = meetings.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.assigned_to IS NULL)
  )
);