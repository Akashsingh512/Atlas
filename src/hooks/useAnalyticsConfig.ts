import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AnalyticsConfig, OverdueConfig, NotificationConfig, UserStatusVisibility } from '@/types/extended';

export function useAnalyticsConfig() {
  return useQuery({
    queryKey: ['analytics-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_config')
        .select('*');

      if (error) throw error;
      return data as AnalyticsConfig[];
    },
  });
}

export function useUpdateAnalyticsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnalyticsConfig> }) => {
      const { error } = await supabase
        .from('analytics_config')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-config'] });
      toast.success('Analytics configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update configuration: ' + error.message);
    },
  });
}

export function useUpdateOverdueConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ status, is_overdue_applicable }: { status: string; is_overdue_applicable: boolean }) => {
      const { error } = await supabase
        .from('overdue_config')
        .update({ is_overdue_applicable })
        .eq('status', status);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-config'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-statuses'] });
      toast.success('Overdue configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update configuration: ' + error.message);
    },
  });
}

export function useNotificationConfig() {
  return useQuery({
    queryKey: ['notification-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_config')
        .select('*');

      if (error) throw error;
      return data as NotificationConfig[];
    },
  });
}

export function useUpdateNotificationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notification_type, is_enabled }: { notification_type: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('notification_config')
        .update({ is_enabled })
        .eq('notification_type', notification_type);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-config'] });
      toast.success('Notification settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });
}

// User status visibility
export function useUserStatusVisibility(userId: string) {
  return useQuery({
    queryKey: ['user-status-visibility', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_status_visibility')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data as UserStatusVisibility[];
    },
    enabled: !!userId,
  });
}

export function useSetUserStatusVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, status, can_view }: { user_id: string; status: string; can_view: boolean }) => {
      // Upsert the visibility setting
      const { error } = await supabase
        .from('user_status_visibility')
        .upsert({ user_id, status, can_view }, { onConflict: 'user_id,status' });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-status-visibility', variables.user_id] });
      toast.success('User visibility updated');
    },
    onError: (error) => {
      toast.error('Failed to update visibility: ' + error.message);
    },
  });
}
