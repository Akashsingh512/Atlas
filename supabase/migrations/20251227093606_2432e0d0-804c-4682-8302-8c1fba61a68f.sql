-- Fix RLS policies for callbacks - users need to update if they're the new assigned_to
DROP POLICY IF EXISTS "Users can update their callbacks" ON public.callbacks;
CREATE POLICY "Users can update accessible callbacks" 
ON public.callbacks 
FOR UPDATE 
USING (
  (assigned_to = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to view callbacks they created or are assigned to
DROP POLICY IF EXISTS "Users can view their callbacks" ON public.callbacks;
CREATE POLICY "Users can view accessible callbacks"
ON public.callbacks
FOR SELECT
USING (
  (assigned_to = auth.uid()) OR 
  (created_by = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix RLS policies for meetings - users assigned to lead can update meetings
DROP POLICY IF EXISTS "Users can update their meetings" ON public.meetings;
CREATE POLICY "Users can update accessible meetings"
ON public.meetings
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (scheduled_by = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM meeting_participants
    WHERE meeting_participants.meeting_id = meetings.id
    AND meeting_participants.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = meetings.lead_id
    AND (leads.assigned_to = auth.uid())
  )
);

-- Allow meeting participants to view meetings
DROP POLICY IF EXISTS "Users can view their participations" ON public.meeting_participants;
CREATE POLICY "Users can view meeting participants"
ON public.meeting_participants
FOR SELECT
USING (
  (user_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_participants.meeting_id
    AND (meetings.scheduled_by = auth.uid())
  )
);