import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { OverdueConfig, OverdueSummary, OverdueLead } from '@/types/extended';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';

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

export function useOverdueSummary() {
  const { user, isAdmin } = useAuth();
  const { data: overdueStatuses } = useOverdueStatuses();

  return useQuery({
    queryKey: ['overdue-summary', user?.id, overdueStatuses],
    queryFn: async () => {
      if (!overdueStatuses || overdueStatuses.length === 0) {
        return { total_overdue: 0, by_status: {}, leads: [] } as OverdueSummary;
      }

      // Get leads with overdue statuses - cast to expected type
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

      // Calculate overdue (leads not updated in 24 hours)
      const now = new Date();
      const overdueLeads: OverdueLead[] = leads
        .filter(lead => {
          const lastActivity = new Date(lead.updated_at);
          const daysDiff = differenceInDays(now, lastActivity);
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
      } as OverdueSummary;
    },
    enabled: !!user && !!overdueStatuses,
    refetchInterval: 30000, // Refresh every 30 seconds for more accurate counts
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}
