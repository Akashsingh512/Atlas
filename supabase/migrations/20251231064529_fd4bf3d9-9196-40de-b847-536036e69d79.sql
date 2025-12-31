-- 1. Add optional date and time columns to follow_ups table
ALTER TABLE public.follow_ups 
ADD COLUMN IF NOT EXISTS follow_up_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS follow_up_time time without time zone DEFAULT NULL;

-- 2. Create a security definer function to check if user has access to a lead
-- This avoids infinite recursion when checking lead access from meetings policy
CREATE OR REPLACE FUNCTION public.user_can_access_lead(_user_id uuid, _lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads
    WHERE id = _lead_id
      AND (
        has_role(_user_id, 'admin'::app_role)
        OR assigned_to = _user_id
        OR (
          assigned_to IS NULL 
          AND location_id IS NOT NULL 
          AND user_has_location_access(_user_id, location_id)
        )
      )
  )
$$;

-- 3. Drop existing problematic meeting policies
DROP POLICY IF EXISTS "Users can view accessible meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can update accessible meetings" ON public.meetings;

-- 4. Recreate meeting policies using the security definer function
CREATE POLICY "Users can view accessible meetings" 
ON public.meetings 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR scheduled_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.meeting_participants 
    WHERE meeting_id = meetings.id AND user_id = auth.uid()
  )
  OR user_can_access_lead(auth.uid(), lead_id)
);

CREATE POLICY "Users can update accessible meetings" 
ON public.meetings 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR scheduled_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.meeting_participants 
    WHERE meeting_id = meetings.id AND user_id = auth.uid()
  )
  OR user_can_access_lead(auth.uid(), lead_id)
);

-- 5. Update leads RLS to properly handle assignment priority over location
-- Assignment has higher priority than location access
DROP POLICY IF EXISTS "Users can view accessible leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update accessible leads" ON public.leads;

CREATE POLICY "Users can view accessible leads" 
ON public.leads 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to = auth.uid()
    -- Only show unassigned leads if user has location access
    OR (
      assigned_to IS NULL 
      AND location_id IS NOT NULL 
      AND user_has_location_access(auth.uid(), location_id)
    )
  )
);

CREATE POLICY "Authenticated users can update accessible leads" 
ON public.leads 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to = auth.uid()
    -- Only allow updating unassigned leads if user has location access
    OR (
      assigned_to IS NULL 
      AND location_id IS NOT NULL 
      AND user_has_location_access(auth.uid(), location_id)
    )
  )
);