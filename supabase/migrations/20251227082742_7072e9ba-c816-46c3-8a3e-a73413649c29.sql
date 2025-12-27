-- Fix profiles table: Add authentication requirement for all operations
-- The existing policies are RESTRICTIVE, so we need PERMISSIVE base policies that require auth

-- Drop existing policies first to recreate with proper authentication checks
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Recreate with PERMISSIVE policies (default) that require authentication
CREATE POLICY "Users can view profiles when authenticated"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix leads table: Ensure authentication is required
-- Drop and recreate existing policies with explicit auth check
DROP POLICY IF EXISTS "Users can view accessible leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update accessible leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

-- Recreate leads policies with explicit authentication requirement
CREATE POLICY "Authenticated users can view accessible leads"
ON public.leads
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    assigned_to = auth.uid() OR
    (assigned_to IS NULL AND location_id IS NOT NULL AND user_has_location_access(auth.uid(), location_id)) OR
    (assigned_to IS NULL AND location_id IS NULL)
  )
);

CREATE POLICY "Admins can insert leads"
ON public.leads
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Authenticated users can update accessible leads"
ON public.leads
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    assigned_to = auth.uid() OR
    (assigned_to IS NULL AND location_id IS NOT NULL AND user_has_location_access(auth.uid(), location_id))
  )
);

CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::app_role)
);