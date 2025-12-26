import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ActivityLogWithUser {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  user?: { id: string; user_id: string; full_name: string; email: string } | null;
}

export function useActivityLogs(limit = 100) {
  return useQuery({
    queryKey: ['activity-logs', limit],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch users
      const userIds = [...new Set(logs.filter(l => l.user_id).map(l => l.user_id!))];
      let profiles: { id: string; user_id: string; full_name: string; email: string }[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .in('user_id', userIds);
        profiles = data || [];
      }

      return logs.map(log => ({
        ...log,
        user: profiles.find(p => p.user_id === log.user_id) || null,
      })) as ActivityLogWithUser[];
    },
  });
}

export type { ActivityLogWithUser };
