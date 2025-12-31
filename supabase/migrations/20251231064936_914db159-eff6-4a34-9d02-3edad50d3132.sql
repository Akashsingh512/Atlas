-- Fix meetings RLS by using a simpler approach that avoids leads table recursion
DROP POLICY IF EXISTS "Users can view accessible meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can update accessible meetings" ON public.meetings;

-- Simplified meeting policies that don't query leads table directly
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
);