import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomStatus {
  id: string;
  name: string;
  label: string;
  color: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export function useCustomStatuses() {
  return useQuery({
    queryKey: ['custom-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_statuses')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CustomStatus[];
    },
  });
}

export function useActiveStatuses() {
  const { data, ...rest } = useCustomStatuses();
  return {
    ...rest,
    data: data?.filter(s => s.is_active) || [],
  };
}

export function useCreateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; label: string; color: string }) => {
      // Get max sort order
      const { data: statuses } = await supabase
        .from('custom_statuses')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = statuses?.[0]?.sort_order || 0;

      const { error } = await supabase
        .from('custom_statuses')
        .insert([{ 
          ...data, 
          sort_order: maxOrder + 1,
          is_system: false 
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-statuses'] });
      toast.success('Status created');
    },
    onError: (error) => {
      toast.error('Failed to create status: ' + error.message);
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomStatus> }) => {
      const { error } = await supabase
        .from('custom_statuses')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-statuses'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

export function useDeleteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-statuses'] });
      toast.success('Status deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete status: ' + error.message);
    },
  });
}
