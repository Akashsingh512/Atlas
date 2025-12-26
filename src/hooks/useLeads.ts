import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadStatus, FollowUp, Profile } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface LeadWithRelations {
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
  location?: { id: string; name: string } | null;
  assigned_user?: { id: string; user_id: string; full_name: string; email: string } | null;
}

interface FollowUpWithCreator {
  id: string;
  lead_id: string;
  comment: string;
  created_by: string | null;
  created_at: string;
  creator?: { id: string; user_id: string; full_name: string } | null;
}

export function useLeads(filters?: { status?: LeadStatus; locationId?: string; search?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          location:locations(id, name),
          assigned_user:profiles(id, user_id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LeadWithRelations[];
    },
    enabled: !!user,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          location:locations(id, name),
          assigned_user:profiles(id, user_id, full_name, email)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as LeadWithRelations | null;
    },
    enabled: !!id,
  });
}

export function useFollowUps(leadId: string) {
  return useQuery({
    queryKey: ['follow-ups', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          creator:profiles(id, user_id, full_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FollowUpWithCreator[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; phone: string; email?: string; location_id?: string; lead_source?: string; notes?: string; assigned_to?: string }) => {
      const { data: lead, error } = await supabase
        .from('leads')
        .insert([{ ...data, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'created',
        entity_type: 'lead',
        entity_id: lead.id,
        new_value: lead,
      }]);

      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create lead: ' + error.message);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data, oldData }: { id: string; data: Partial<Lead>; oldData?: Lead }) => {
      const { data: lead, error } = await supabase
        .from('leads')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'updated',
        entity_type: 'lead',
        entity_id: id,
        old_value: oldData ? { status: oldData.status } : null,
        new_value: { status: lead.status },
      }]);

      return lead;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.id] });
      toast.success('Lead updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update lead: ' + error.message);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // Log activity first
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'deleted',
        entity_type: 'lead',
        entity_id: id,
      }]);

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete lead: ' + error.message);
    },
  });
}

export function useAddFollowUp() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ leadId, comment }: { leadId: string; comment: string }) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert([{ lead_id: leadId, comment, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Follow-up added');
    },
    onError: (error) => {
      toast.error('Failed to add follow-up: ' + error.message);
    },
  });
}

export type { LeadWithRelations, FollowUpWithCreator };
