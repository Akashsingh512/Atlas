// Type definitions for Atlas CRM Application

export type AppRole = 'admin' | 'user' | 'pre_sales' | 'sales';

export type LeadStatus = 'open' | 'follow_up' | 'closed' | 'junk' | 'future' | 'others';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLocation {
  id: string;
  user_id: string;
  location_id: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location_id: string | null;
  lead_source: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  follow_up_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  location?: Location;
  assigned_user?: Profile;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  comment: string;
  created_by: string | null;
  created_at: string;
  // Joined fields
  creator?: Profile;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  // Joined fields
  user?: Profile;
}

export interface LeadAssignmentHistory {
  id: string;
  lead_id: string;
  assigned_from: string | null;
  assigned_to: string | null;
  assigned_by: string;
  notes: string | null;
  created_at: string;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  full_name: string;
}

export interface LeadFormData {
  name: string;
  phone: string;
  email?: string;
  location_id?: string;
  lead_source?: string;
  notes?: string;
  assigned_to?: string;
}

export interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: AppRole;
  location_ids: string[];
}

// Stats types
export interface LeadStats {
  total: number;
  open: number;
  follow_up: number;
  closed: number;
  junk: number;
  future: number;
  others: number;
}

export interface UserPerformance {
  user_id: string;
  full_name: string;
  assigned: number;
  contacted: number;
  closed: number;
  junk: number;
  pending_follow_ups: number;
}

// Lead status configuration
export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'open' },
  follow_up: { label: 'Follow-Up', color: 'follow-up' },
  closed: { label: 'Closed', color: 'closed' },
  junk: { label: 'Junk', color: 'junk' },
  future: { label: 'Future', color: 'future' },
  others: { label: 'Others', color: 'others' },
};

// Role configuration
export const ROLE_CONFIG: Record<AppRole, { label: string; description: string; canAssignTo: AppRole[] }> = {
  admin: { label: 'Admin', description: 'Full system access', canAssignTo: ['admin', 'user', 'pre_sales', 'sales'] },
  user: { label: 'User', description: 'Standard user', canAssignTo: [] },
  pre_sales: { label: 'Pre-Sales', description: 'Handle initial lead contact', canAssignTo: ['sales'] },
  sales: { label: 'Sales', description: 'Close deals', canAssignTo: [] },
};