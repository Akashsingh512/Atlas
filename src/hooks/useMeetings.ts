import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Meeting, MeetingFormData } from '@/types/extended';

export function useMeetings(filters?: { date?: string; status?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meetings', filters],
    queryFn: async () => {
      let query = supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: true })
        .order('meeting_time', { ascending: true });

      if (filters?.date) {
        query = query.eq('meeting_date', filters.date);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data: meetings, error } = await query;
      if (error) throw error;

      // Fetch leads
      const leadIds = [...new Set(meetings.map(m => m.lead_id))];
      let leads: { id: string; name: string; phone: string }[] = [];
      if (leadIds.length > 0) {
        const { data } = await supabase
          .from('leads')
          .select('id, name, phone')
          .in('id', leadIds);
        leads = data || [];
      }

      // Fetch schedulers
      const schedulerIds = [...new Set(meetings.filter(m => m.scheduled_by).map(m => m.scheduled_by!))];
      let schedulers: { user_id: string; full_name: string }[] = [];
      if (schedulerIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', schedulerIds);
        schedulers = data || [];
      }

      // Fetch participants
      const meetingIds = meetings.map(m => m.id);
      let participants: { id: string; meeting_id: string; user_id: string; created_at: string }[] = [];
      if (meetingIds.length > 0) {
        const { data } = await supabase
          .from('meeting_participants')
          .select('id, meeting_id, user_id, created_at')
          .in('meeting_id', meetingIds);
        participants = data || [];
      }

      return meetings.map(meeting => ({
        ...meeting,
        status: meeting.status as Meeting['status'],
        lead: leads.find(l => l.id === meeting.lead_id),
        scheduler: schedulers.find(s => s.user_id === meeting.scheduled_by),
        participants: participants.filter(p => p.meeting_id === meeting.id),
      }));
    },
    enabled: !!user,
  });
}

export function useTodayMeetings() {
  const today = new Date().toISOString().split('T')[0];
  return useMeetings({ date: today, status: 'scheduled' });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: MeetingFormData) => {
      const { participant_ids, ...meetingData } = data;
      
      // Check for existing scheduled meeting for this lead on the same date
      const { data: existingMeetings, error: checkError } = await supabase
        .from('meetings')
        .select('id')
        .eq('lead_id', data.lead_id)
        .eq('meeting_date', data.meeting_date)
        .eq('status', 'scheduled');
      
      if (checkError) throw checkError;
      
      if (existingMeetings && existingMeetings.length > 0) {
        throw new Error('A meeting is already scheduled for this lead on this date');
      }
      
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert([{ ...meetingData, scheduled_by: user?.id }])
        .select()
        .single();

      if (error) throw error;

      // Add participants
      if (participant_ids.length > 0) {
        const participantRecords = participant_ids.map(userId => ({
          meeting_id: meeting.id,
          user_id: userId,
        }));
        await supabase.from('meeting_participants').insert(participantRecords);
      }

      // Create notifications for participants
      const notifications = participant_ids.map(userId => ({
        user_id: userId,
        title: 'New Meeting Scheduled',
        message: `A meeting has been scheduled for ${data.meeting_date} at ${data.meeting_time}`,
        type: 'meeting',
        related_entity_type: 'meeting',
        related_entity_id: meeting.id,
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'created',
        entity_type: 'meeting',
        entity_id: meeting.id,
        new_value: meeting,
      }]);

      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Meeting scheduled successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to schedule meeting');
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status?: string; notes?: string } }) => {
      const { error } = await supabase
        .from('meetings')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'updated',
        entity_type: 'meeting',
        entity_id: id,
        new_value: data,
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Meeting updated');
    },
    onError: (error) => {
      toast.error('Failed to update meeting: ' + error.message);
    },
  });
}
