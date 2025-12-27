import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AssignmentHistoryEntry {
  id: string;
  lead_id: string;
  assigned_from: string | null;
  assigned_to: string | null;
  assigned_by: string;
  notes: string | null;
  created_at: string;
  from_user?: { full_name: string } | null;
  to_user?: { full_name: string } | null;
  by_user?: { full_name: string } | null;
}

export function useLeadAssignmentHistory(leadId: string) {
  return useQuery({
    queryKey: ['lead-assignment-history', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_assignment_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names
      const userIds = [
        ...new Set([
          ...data.filter(h => h.assigned_from).map(h => h.assigned_from!),
          ...data.filter(h => h.assigned_to).map(h => h.assigned_to!),
          ...data.map(h => h.assigned_by),
        ])
      ];

      let profiles: { user_id: string; full_name: string }[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profiles = profileData || [];
      }

      return data.map(entry => ({
        ...entry,
        from_user: profiles.find(p => p.user_id === entry.assigned_from) || null,
        to_user: profiles.find(p => p.user_id === entry.assigned_to) || null,
        by_user: profiles.find(p => p.user_id === entry.assigned_by) || null,
      })) as AssignmentHistoryEntry[];
    },
    enabled: !!leadId,
  });
}

export type { AssignmentHistoryEntry };