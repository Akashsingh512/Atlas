-- 1. Create ticket_messages table for admin-user messaging
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  parent_id UUID REFERENCES public.ticket_messages(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policies for ticket_messages
CREATE POLICY "Users can view messages where they are sender or recipient"
ON public.ticket_messages
FOR SELECT
USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND sender_id = auth.uid());

CREATE POLICY "Users can update their received messages to mark as read"
ON public.ticket_messages
FOR UPDATE
USING (recipient_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Create custom_statuses table for admin-defined lead statuses
CREATE TABLE public.custom_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'secondary',
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.custom_statuses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view active statuses"
ON public.custom_statuses
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage statuses"
ON public.custom_statuses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with default system statuses
INSERT INTO public.custom_statuses (name, label, color, is_system, sort_order) VALUES
  ('open', 'Open', 'default', true, 1),
  ('follow_up', 'Follow Up', 'follow_up', true, 2),
  ('closed', 'Closed', 'success', true, 3),
  ('junk', 'Junk', 'destructive', true, 4),
  ('future', 'Future', 'secondary', true, 5),
  ('others', 'Others', 'outline', true, 6);

-- 3. Add push_subscription to profiles for PWA push notifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_subscription JSONB;