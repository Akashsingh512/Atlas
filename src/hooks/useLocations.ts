import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useLocations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Location[];
    },
    enabled: !!user,
  });
}

export function useUserLocations(userId?: string) {
  return useQuery({
    queryKey: ['user-locations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*, location:locations(*)')
        .eq('user_id', userId!);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; address?: string }) => {
      const { data: location, error } = await supabase
        .from('locations')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      await supabase.from('activity_logs').insert([{
        user_id: user?.id,
        action: 'created',
        entity_type: 'location',
        entity_id: location.id,
        new_value: location,
      }]);

      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location created');
    },
    onError: (error) => {
      toast.error('Failed to create location: ' + error.message);
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Location> }) => {
      const { data: location, error } = await supabase
        .from('locations')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location updated');
    },
    onError: (error) => {
      toast.error('Failed to update location: ' + error.message);
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete location: ' + error.message);
    },
  });
}
