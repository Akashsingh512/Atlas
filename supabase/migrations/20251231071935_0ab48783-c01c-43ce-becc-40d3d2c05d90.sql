-- Fix infinite recursion between public.meetings and public.meeting_participants RLS
-- NOTE: Previous attempt failed due to incorrect function SET syntax.

CREATE OR REPLACE FUNCTION public.user_can_access_meeting(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meetings m
    WHERE m.id = _meeting_id
      AND (
        public.has_role(_user_id, 'admin'::app_role)
        OR m.scheduled_by = _user_id
        OR public.user_can_access_lead(_user_id, m.lead_id)
        OR EXISTS (
          SELECT 1
          FROM public.meeting_participants mp
          WHERE mp.meeting_id = m.id
            AND mp.user_id = _user_id
        )
      )
  );
$$;

-- Meetings: replace participant-based policies to use the function
DROP POLICY IF EXISTS "Users can view accessible meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can update accessible meetings" ON public.meetings;

CREATE POLICY "Users can view accessible meetings"
ON public.meetings
FOR SELECT
USING (public.user_can_access_meeting(auth.uid(), id));

CREATE POLICY "Users can update accessible meetings"
ON public.meetings
FOR UPDATE
USING (public.user_can_access_meeting(auth.uid(), id));

-- Meeting participants: remove direct reference to meetings (which created recursion)
DROP POLICY IF EXISTS "Users can view meeting participants" ON public.meeting_participants;

CREATE POLICY "Users can view meeting participants"
ON public.meeting_participants
FOR SELECT
USING (
  (user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.user_can_access_meeting(auth.uid(), meeting_id)
);
