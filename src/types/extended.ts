// Extended types for Atlas advanced features

import { LeadStatus } from './index';

export interface Meeting {
  id: string;
  lead_id: string;
  meeting_date: string;
  meeting_time: string;
  meeting_place: string;
  scheduled_by: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: { id: string; name: string; phone: string };
  scheduler?: { full_name: string };
  participants?: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  created_at: string;
  // Joined
  user?: { full_name: string; email: string };
}

export interface Callback {
  id: string;
  lead_id: string;
  callback_datetime: string;
  assigned_to: string;
  status: 'pending' | 'completed' | 'missed';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: { id: string; name: string; phone: string };
  assigned_user?: { full_name: string };
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'meeting' | 'callback' | 'overdue' | 'announcement' | 'missed_call' | 'ticket';
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface OverdueConfig {
  id: string;
  status: string;
  is_overdue_applicable: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsConfig {
  id: string;
  metric_name: string;
  included_statuses: string[];
  excluded_statuses: string[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationConfig {
  id: string;
  notification_type: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  meetings_enabled: boolean;
  overdue_enabled: boolean;
  callbacks_enabled: boolean;
  announcements_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserStatusVisibility {
  id: string;
  user_id: string;
  status: string;
  can_view: boolean;
  created_at: string;
}

export interface BulkUpload {
  id: string;
  uploaded_by: string;
  file_name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  status: 'processing' | 'completed' | 'failed';
  error_report: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_role: string | null;
  target_user_id: string | null;
  created_by: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

// Extended Lead form data
export interface ExtendedLeadFormData {
  name: string;
  phone: string;
  email?: string;
  location_id: string;
  property_type: string;
  budget: string;
  lead_source?: string;
  status?: LeadStatus;
  assigned_to?: string;
  notes?: string;
}

// Bulk upload row interface
export interface BulkUploadRow {
  name: string;
  phone: string;
  location: string;
  email?: string;
  property_type?: string;
  budget?: string;
  status?: string;
  assigned_to?: string;
  source?: string;
  comments?: string;
}

// Analytics data
export interface AnalyticsData {
  total_leads: number;
  junk_ratio: number;
  conversion_ratio: number;
  closure_rate: number;
  status_distribution: Record<string, number>;
  user_performance: UserPerformanceData[];
  leads_by_location: Record<string, number>;
}

export interface UserPerformanceData {
  user_id: string;
  full_name: string;
  total_assigned: number;
  closed: number;
  junk: number;
  pending: number;
  conversion_rate: number;
}

// Overdue summary
export interface OverdueSummary {
  total_overdue: number;
  by_status: Record<string, number>;
  leads: OverdueLead[];
}

export interface OverdueLead {
  id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  last_activity: string;
  days_overdue: number;
}

// Meeting form data
export interface MeetingFormData {
  lead_id: string;
  meeting_date: string;
  meeting_time: string;
  meeting_place: string;
  participant_ids: string[];
  notes?: string;
}

// Callback form data
export interface CallbackFormData {
  lead_id: string;
  callback_datetime: string;
  assigned_to: string;
  notes?: string;
}
