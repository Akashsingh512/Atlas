import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Announcement } from '@/types/extended';

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
  });
}

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: ['active-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    refetchInterval: 60000,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<Announcement, 'id' | 'created_at' | 'created_by'>) => {
      const { data: announcement, error } = await supabase
        .from('announcements')
        .insert([{ ...data, created_by: user!.id }])
        .select()
        .single();

      if (error) throw error;

      // Create notifications based on target
      let usersQuery = supabase.from('profiles').select('user_id');
      
      if (data.target_user_id) {
        usersQuery = usersQuery.eq('user_id', data.target_user_id);
      } else if (data.target_role === 'admin') {
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');
        if (adminUsers) {
          const adminIds = adminUsers.map(u => u.user_id);
          usersQuery = usersQuery.in('user_id', adminIds);
        }
      }

      const { data: users } = await usersQuery;
      
      if (users && users.length > 0) {
        const notifications = users.map(u => ({
          user_id: u.user_id,
          title: data.title,
          message: data.message,
          type: 'announcement',
          related_entity_type: 'announcement',
          related_entity_id: announcement.id,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Announcement published');
    },
    onError: (error) => {
      toast.error('Failed to publish announcement: ' + error.message);
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Announcement> }) => {
      const { error } = await supabase
        .from('announcements')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
      toast.success('Announcement updated');
    },
    onError: (error) => {
      toast.error('Failed to update announcement: ' + error.message);
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete announcement: ' + error.message);
    },
  });
}
