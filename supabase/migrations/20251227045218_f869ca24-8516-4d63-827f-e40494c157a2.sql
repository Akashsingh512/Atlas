
-- =====================================================
-- Atlas nded Features Migration
-- =====================================================

-- 1. Add new columns to leads table for property details
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget TEXT;

-- 2. Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  meeting_place TEXT NOT NULL,
  scheduled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting participants (for shared visibility)
CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- 3. Create callbacks table
CREATE TABLE public.callbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  callback_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_to UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, missed
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- meeting, callback, overdue, announcement, missed_call
  related_entity_type TEXT, -- lead, meeting, callback
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Admin configuration tables

-- Overdue status configuration
CREATE TABLE public.overdue_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL UNIQUE,
  is_overdue_applicable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Analytics configuration (which statuses count for each metric)
CREATE TABLE public.analytics_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL UNIQUE, -- conversion_ratio, closure_rate, junk_ratio
  included_statuses TEXT[] NOT NULL DEFAULT '{}',
  excluded_statuses TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification settings configuration
CREATE TABLE public.notification_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL UNIQUE, -- meeting, overdue, callback, missed_call, announcement
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User-specific notification preferences
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  meetings_enabled BOOLEAN NOT NULL DEFAULT true,
  overdue_enabled BOOLEAN NOT NULL DEFAULT true,
  callbacks_enabled BOOLEAN NOT NULL DEFAULT true,
  announcements_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User status visibility (which statuses a user can see)
CREATE TABLE public.user_status_visibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, status)
);

-- 6. Bulk upload tracking
CREATE TABLE public.bulk_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  error_report JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 7. Announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  target_role TEXT, -- null means all, 'admin' or 'user'
  target_user_id UUID, -- specific user if needed
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Enable RLS on all new tables
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overdue_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- Meetings: Admin full access, users see their related meetings
CREATE POLICY "Admins can manage all meetings" ON public.meetings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view meetings they participate in" ON public.meetings
FOR SELECT USING (
  scheduled_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.meeting_participants WHERE meeting_id = meetings.id AND user_id = auth.uid())
);

CREATE POLICY "Users can create meetings" ON public.meetings
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their meetings" ON public.meetings
FOR UPDATE USING (scheduled_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Meeting participants
CREATE POLICY "Admins can manage meeting participants" ON public.meeting_participants
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their participations" ON public.meeting_participants
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can add participants" ON public.meeting_participants
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Callbacks
CREATE POLICY "Admins can manage all callbacks" ON public.callbacks
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their callbacks" ON public.callbacks
FOR SELECT USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can create callbacks" ON public.callbacks
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their callbacks" ON public.callbacks
FOR UPDATE USING (assigned_to = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their notifications" ON public.notifications
FOR DELETE USING (user_id = auth.uid());

-- Config tables: Admin only
CREATE POLICY "Admins can manage overdue config" ON public.overdue_config
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view overdue config" ON public.overdue_config
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage analytics config" ON public.analytics_config
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view analytics config" ON public.analytics_config
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage notification config" ON public.notification_config
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view notification config" ON public.notification_config
FOR SELECT USING (auth.uid() IS NOT NULL);

-- User notification preferences
CREATE POLICY "Users can manage their notification preferences" ON public.user_notification_preferences
FOR ALL USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- User status visibility
CREATE POLICY "Admins can manage status visibility" ON public.user_status_visibility
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their status visibility" ON public.user_status_visibility
FOR SELECT USING (user_id = auth.uid());

-- Bulk uploads: Admin only
CREATE POLICY "Admins can manage bulk uploads" ON public.bulk_uploads
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Announcements
CREATE POLICY "Admins can manage announcements" ON public.announcements
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active announcements" ON public.announcements
FOR SELECT USING (
  is_active = true AND
  (expires_at IS NULL OR expires_at > now()) AND
  (target_role IS NULL OR 
   (target_role = 'admin' AND has_role(auth.uid(), 'admin'::app_role)) OR
   (target_role = 'user' AND NOT has_role(auth.uid(), 'admin'::app_role))) AND
  (target_user_id IS NULL OR target_user_id = auth.uid())
);

-- 10. Update triggers for updated_at
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_callbacks_updated_at BEFORE UPDATE ON public.callbacks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_overdue_config_updated_at BEFORE UPDATE ON public.overdue_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_config_updated_at BEFORE UPDATE ON public.analytics_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_config_updated_at BEFORE UPDATE ON public.notification_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Insert default configurations

-- Default overdue statuses
INSERT INTO public.overdue_config (status, is_overdue_applicable) VALUES
('open', true),
('follow_up', true),
('closed', false),
('junk', false),
('future', false),
('others', false)
ON CONFLICT (status) DO NOTHING;

-- Default analytics config
INSERT INTO public.analytics_config (metric_name, included_statuses, excluded_statuses, description) VALUES
('conversion_ratio', ARRAY['closed'], ARRAY['junk', 'future'], 'Ratio of closed leads to total actionable leads'),
('closure_rate', ARRAY['closed'], ARRAY[]::TEXT[], 'Percentage of all leads that are closed'),
('junk_ratio', ARRAY['junk'], ARRAY[]::TEXT[], 'Percentage of leads marked as junk')
ON CONFLICT (metric_name) DO NOTHING;

-- Default notification config
INSERT INTO public.notification_config (notification_type, is_enabled) VALUES
('meeting', true),
('overdue', true),
('callback', true),
('missed_call', true),
('announcement', true)
ON CONFLICT (notification_type) DO NOTHING;

-- 12. Create index for performance
CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON public.meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_by ON public.meetings(scheduled_by);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_date ON public.meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON public.meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_lead_id ON public.callbacks(lead_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_assigned_to ON public.callbacks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_callbacks_datetime ON public.callbacks(callback_datetime);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_bulk_uploads_uploaded_by ON public.bulk_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_leads_property_type ON public.leads(property_type);
CREATE INDEX IF NOT EXISTS idx_leads_budget ON public.leads(budget);
