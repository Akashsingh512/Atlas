import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { OverdueConfig, OverdueSummary, OverdueLead } from '@/types/extended';
import { differenceInDays, isToday, parseISO, isBefore, format, isEqual, startOfDay } from 'date-fns';
import { toast } from 'sonner';

// Extended types for follow-up scheduling
export interface ScheduledFollowUp {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  follow_up_date: string;
  follow_up_time: string | null;
  comment: string;
  created_by: string | null;
}

export function useOverdueConfig() {
  return useQuery({
    queryKey: ['overdue-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overdue_config')
        .select('*')
        .order('status');

      if (error) throw error;
      return data as OverdueConfig[];
    },
  });
}

export function useOverdueStatuses() {
  return useQuery({
    queryKey: ['overdue-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overdue_config')
        .select('status')
        .eq('is_overdue_applicable', true);

      if (error) throw error;
      return data.map(d => d.status);
    },
  });
}

// Hook to get follow-ups scheduled for today
export function useTodayFollowUps() {
  const { user, isAdmin } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['today-followups', user?.id],
    queryFn: async () => {
      // Get follow-ups with scheduled date = today
      let query = supabase
        .from('follow_ups')
        .select('id, lead_id, follow_up_date, follow_up_time, comment, created_by')
        .eq('follow_up_date', today);

      const { data: followUps, error } = await query;
      if (error) throw error;
      if (!followUps || followUps.length === 0) return [];

      // Get the leads for these follow-ups
      const leadIds = [...new Set(followUps.map(f => f.lead_id))];
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, phone, assigned_to')
        .in('id', leadIds);

      // Filter based on user access
      const accessibleFollowUps = followUps.filter(f => {
        const lead = leads?.find(l => l.id === f.lead_id);
        if (!lead) return false;
        if (isAdmin) return true;
        return lead.assigned_to === user?.id;
      });

      return accessibleFollowUps.map(f => {
        const lead = leads?.find(l => l.id === f.lead_id);
        return {
          ...f,
          lead_name: lead?.name || 'Unknown',
          lead_phone: lead?.phone || '',
        } as ScheduledFollowUp;
      }).sort((a, b) => {
        // Sort by time, null times last
        if (!a.follow_up_time && !b.follow_up_time) return 0;
        if (!a.follow_up_time) return 1;
        if (!b.follow_up_time) return -1;
        return a.follow_up_time.localeCompare(b.follow_up_time);
      });
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

// Hook to get overdue follow-ups (scheduled date < today)
export function useOverdueFollowUps() {
  const { user, isAdmin } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['overdue-followups', user?.id],
    queryFn: async () => {
      // Get follow-ups with scheduled date < today
      let query = supabase
        .from('follow_ups')
        .select('id, lead_id, follow_up_date, follow_up_time, comment, created_by')
        .lt('follow_up_date', today)
        .not('follow_up_date', 'is', null);

      const { data: followUps, error } = await query;
      if (error) throw error;
      if (!followUps || followUps.length === 0) return [];

      // Get the leads for these follow-ups
      const leadIds = [...new Set(followUps.map(f => f.lead_id))];
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, phone, assigned_to, status')
        .in('id', leadIds);

      // Only include leads that are still in active statuses (not closed/junk)
      const activeStatuses = ['open', 'follow_up', 'future', 'others'];
      
      // Filter based on user access and active leads
      const accessibleFollowUps = followUps.filter(f => {
        const lead = leads?.find(l => l.id === f.lead_id);
        if (!lead) return false;
        if (!activeStatuses.includes(lead.status)) return false;
        if (isAdmin) return true;
        return lead.assigned_to === user?.id;
      });

      return accessibleFollowUps.map(f => {
        const lead = leads?.find(l => l.id === f.lead_id);
        return {
          ...f,
          lead_name: lead?.name || 'Unknown',
          lead_phone: lead?.phone || '',
        } as ScheduledFollowUp;
      });
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useOverdueSummary() {
  const { user, isAdmin } = useAuth();
  const { data: overdueStatuses } = useOverdueStatuses();
  const { data: overdueFollowUps } = useOverdueFollowUps();
  const { data: todayFollowUps } = useTodayFollowUps();

  return useQuery({
    queryKey: ['overdue-summary', user?.id, overdueStatuses, overdueFollowUps?.length, todayFollowUps?.length],
    queryFn: async () => {
      if (!overdueStatuses || overdueStatuses.length === 0) {
        return { 
          total_overdue: 0, 
          by_status: {}, 
          leads: [],
          scheduled_today: todayFollowUps || [],
          overdue_followups: overdueFollowUps || [],
        };
      }

      // Get leads with overdue statuses
      const validStatuses = overdueStatuses as Array<'open' | 'follow_up' | 'closed' | 'junk' | 'future' | 'others'>;
      let query = supabase
        .from('leads')
        .select('id, name, phone, status, updated_at')
        .in('status', validStatuses);

      // Non-admin users only see their assigned leads
      if (!isAdmin) {
        query = query.eq('assigned_to', user!.id);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Calculate overdue (leads not updated in 24 hours AND no scheduled follow-up for today/future)
      const now = new Date();
      const overdueLeads: OverdueLead[] = leads
        .filter(lead => {
          const lastActivity = new Date(lead.updated_at);
          const daysDiff = differenceInDays(now, lastActivity);
          
          // Check if this lead has a scheduled follow-up for today
          const hasScheduledToday = todayFollowUps?.some(f => f.lead_id === lead.id);
          if (hasScheduledToday) return false;
          
          return daysDiff >= 1;
        })
        .map(lead => ({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          status: lead.status,
          last_activity: lead.updated_at,
          days_overdue: differenceInDays(now, new Date(lead.updated_at)),
        }));

      // Group by status
      const byStatus: Record<string, number> = {};
      overdueLeads.forEach(lead => {
        byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      });

      return {
        total_overdue: overdueLeads.length,
        by_status: byStatus,
        leads: overdueLeads.sort((a, b) => b.days_overdue - a.days_overdue),
        scheduled_today: todayFollowUps || [],
        overdue_followups: overdueFollowUps || [],
      };
    },
    enabled: !!user && !!overdueStatuses,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 15000,
  });
}
