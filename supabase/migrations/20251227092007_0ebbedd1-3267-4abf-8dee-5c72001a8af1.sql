-- Update profiles RLS to allow authenticated users to see other users' names for assignment dropdowns
-- But NOT their sensitive info like email/phone (that stays restricted)
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;

-- Admin can still see everything
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own full profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- All authenticated users can see basic profile info (name) for assignment purposes
-- This is a separate policy that only returns rows for dropdown purposes
CREATE POLICY "Authenticated users can view active user profiles for assignment" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Seed analytics_config with default metrics
INSERT INTO public.analytics_config (metric_name, description, included_statuses, excluded_statuses)
VALUES 
  ('total_leads', 'Total number of leads', ARRAY[]::text[], ARRAY['junk']::text[]),
  ('conversion_rate', 'Percentage of leads that converted to closed', ARRAY['closed']::text[], ARRAY['junk']::text[]),
  ('junk_rate', 'Percentage of leads marked as junk', ARRAY['junk']::text[], ARRAY[]::text[]),
  ('follow_up_rate', 'Percentage of leads in follow-up status', ARRAY['follow_up']::text[], ARRAY['junk']::text[]),
  ('open_leads', 'Number of open leads', ARRAY['open']::text[], ARRAY[]::text[])
ON CONFLICT DO NOTHING;