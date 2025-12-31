-- Fix meetings INSERT policy to check lead access
DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;

CREATE POLICY "Users can create meetings for accessible leads"
ON public.meetings
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_can_access_lead(auth.uid(), lead_id)
  )
);