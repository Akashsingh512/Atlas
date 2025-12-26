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
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles(id, user_id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLogWithUser[];
    },
  });
}

export type { ActivityLogWithUser };
