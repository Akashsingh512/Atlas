import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Callback, CallbackFormData } from '@/types/extended';

// Helper to format datetime for display in local timezone
export function formatCallbackDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Helper to get just the date portion
export function formatCallbackDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// Helper to get just the time portion
export function formatCallbackTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

export function useCallbacks(filters?: { status?: string; date?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['callbacks', filters],
    queryFn: async () => {
      let query = supabase
        .from('callbacks')
        .select('*')
        .order('callback_datetime', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date) {
        // Filter by date - get callbacks for the entire day in local timezone
        const startOfDay = new Date(`${filters.date}T00:00:00`);
        const endOfDay = new Date(`${filters.date}T23:59:59`);
        query = query
          .gte('callback_datetime', startOfDay.toISOString())
          .lt('callback_datetime', endOfDay.toISOString());
      }

      const { data: callbacks, error } = await query;
      if (error) throw error;

      // Fetch leads
      const leadIds = [...new Set(callbacks.map(c => c.lead_id))];
      let leads: { id: string; name: string; phone: string }[] = [];
      if (leadIds.length > 0) {
        const { data } = await supabase
          .from('leads')
          .select('id, name, phone')
          .in('id', leadIds);
        leads = data || [];
      }

      // Fetch assigned users
      const userIds = [...new Set(callbacks.map(c => c.assigned_to))];
      let users: { user_id: string; full_name: string }[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        users = data || [];
      }

      return callbacks.map(callback => ({
        ...callback,
        lead: leads.find(l => l.id === callback.lead_id),
        assigned_user: users.find(u => u.user_id === callback.assigned_to),
      })) as Callback[];
    },
    enabled: !!user,
  });
}

export function useTodayCallbacks() {
  const today = new Date().toISOString().split('T')[0];
  return useCallbacks({ date: today, status: 'pending' });
}

export function useCreateCallback() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CallbackFormData) => {
      // Check for existing pending callback for this lead on the same date
      const callbackDate = new Date(data.callback_datetime);
      const dateStr = callbackDate.toISOString().split('T')[0];
      const startOfDay = new Date(`${dateStr}T00:00:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59`);
      
      const { data: existingCallbacks, error: checkError } = await supabase
        .from('callbacks')
        .select('id')
        .eq('lead_id', data.lead_id)
        .eq('status', 'pending')
        .gte('callback_datetime', startOfDay.toISOString())
        .lt('callback_datetime', endOfDay.toISOString());
      
      if (checkError) throw checkError;
      
      if (existingCallbacks && existingCallbacks.length > 0) {
        throw new Error('A callback is already scheduled for this lead on this date');
      }
      
      const { data: callback, error } = await supabase
        .from('callbacks')
        .insert([{ ...data, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;

      // Create notification with properly formatted time
      await supabase.from('notifications').insert([{
        user_id: data.assigned_to,
        title: 'Callback Scheduled',
        message: `A callback has been scheduled for ${callbackDate.toLocaleString()}`,
        type: 'callback',
        related_entity_type: 'callback',
        related_entity_id: callback.id,
      }]);

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'created',
        entity_type: 'callback',
        entity_id: callback.id,
        new_value: callback,
      }]);

      return callback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Callback scheduled');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to schedule callback');
    },
  });
}

export function useUpdateCallback() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Callback> }) => {
      const { error } = await supabase
        .from('callbacks')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'updated',
        entity_type: 'callback',
        entity_id: id,
        new_value: data,
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
      toast.success('Callback updated');
    },
    onError: (error) => {
      toast.error('Failed to update callback: ' + error.message);
    },
  });
}