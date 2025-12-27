import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface TicketMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  message: string;
  parent_id: string | null;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string };
  recipient?: { full_name: string };
  replies?: TicketMessage[];
}

export function useTickets() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['tickets', user?.id],
    queryFn: async () => {
      // Get root messages (no parent) where user is sender or recipient
      const { data: messages, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all user profiles for sender/recipient info
      const userIds = [...new Set(messages.flatMap(m => [m.sender_id, m.recipient_id]))];
      let profiles: { user_id: string; full_name: string }[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profiles = data || [];
      }

      // Get all replies
      const messageIds = messages.map(m => m.id);
      let replies: TicketMessage[] = [];
      if (messageIds.length > 0) {
        const { data } = await supabase
          .from('ticket_messages')
          .select('*')
          .in('parent_id', messageIds)
          .order('created_at', { ascending: true });
        replies = (data || []) as TicketMessage[];
      }

      return messages.map(msg => ({
        ...msg,
        sender: profiles.find(p => p.user_id === msg.sender_id),
        recipient: profiles.find(p => p.user_id === msg.recipient_id),
        replies: replies
          .filter(r => r.parent_id === msg.id)
          .map(r => ({
            ...r,
            sender: profiles.find(p => p.user_id === r.sender_id),
            recipient: profiles.find(p => p.user_id === r.recipient_id),
          })),
      })) as TicketMessage[];
    },
    enabled: !!user,
  });
}

export function useUnreadTicketsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tickets-unread', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ticket_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user!.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useSendTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { recipient_id: string; subject: string; message: string; parent_id?: string }) => {
      const { error } = await supabase
        .from('ticket_messages')
        .insert([{
          sender_id: user!.id,
          recipient_id: data.recipient_id,
          subject: data.subject,
          message: data.message,
          parent_id: data.parent_id || null,
        }]);

      if (error) throw error;

      // Also create a notification for the recipient
      await supabase.from('notifications').insert([{
        user_id: data.recipient_id,
        title: data.parent_id ? 'New Reply to Your Message' : 'New Message from Admin',
        message: data.subject,
        type: 'ticket',
        related_entity_type: 'ticket',
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Message sent');
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });
}

export function useMarkTicketRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_messages')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-unread'] });
    },
  });
}
