-- Fix 1: Profiles table - restrict to own profile or admin only
DROP POLICY IF EXISTS "Users can view profiles when authenticated" ON public.profiles;

CREATE POLICY "Users can view own profile or admin can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Fix 2: Leads table - remove the clause allowing unassigned leads without location to be viewed by all
-- Only admins can see unassigned leads without location
DROP POLICY IF EXISTS "Authenticated users can view accessible leads" ON public.leads;

CREATE POLICY "Users can view accessible leads"
ON public.leads
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    assigned_to = auth.uid() OR
    (assigned_to IS NULL AND location_id IS NOT NULL AND user_has_location_access(auth.uid(), location_id))
  )
);

-- Fix 3: Activity logs - restrict insert to only log own actions
DROP POLICY IF EXISTS "All authenticated users can create activity logs" ON public.activity_logs;

CREATE POLICY "Users can only log their own actions"
ON public.activity_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR
    user_id IS NULL
  )
);