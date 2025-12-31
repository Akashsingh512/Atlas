import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Location, SubLocation } from '@/types';
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

export function useLocationsWithSubLocations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['locations-with-subs'],
    queryFn: async () => {
      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (locError) throw locError;

      const { data: subLocations, error: subError } = await supabase
        .from('sub_locations')
        .select('*')
        .order('name');

      if (subError) throw subError;

      return (locations as Location[]).map(loc => ({
        ...loc,
        sub_locations: (subLocations as SubLocation[]).filter(sub => sub.location_id === loc.id),
      }));
    },
    enabled: !!user,
  });
}

export function useSubLocations(locationId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sub-locations', locationId],
    queryFn: async () => {
      let query = supabase
        .from('sub_locations')
        .select('*')
        .order('name');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubLocation[];
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
      queryClient.invalidateQueries({ queryKey: ['locations-with-subs'] });
      toast.success('City created');
    },
    onError: (error) => {
      toast.error('Failed to create city: ' + error.message);
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
      queryClient.invalidateQueries({ queryKey: ['locations-with-subs'] });
      toast.success('City updated');
    },
    onError: (error) => {
      toast.error('Failed to update city: ' + error.message);
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
      queryClient.invalidateQueries({ queryKey: ['locations-with-subs'] });
      toast.success('City deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete city: ' + error.message);
    },
  });
}

// Sub-location hooks
export function useCreateSubLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { location_id: string; name: string; address?: string }) => {
      const { data: subLocation, error } = await supabase
        .from('sub_locations')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return subLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations-with-subs'] });
      toast.success('Office/Branch created');
    },
    onError: (error) => {
      toast.error('Failed to create office: ' + error.message);
    },
  });
}

export function useUpdateSubLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubLocation> }) => {
      const { data: subLocation, error } = await supabase
        .from('sub_locations')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return subLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations-with-subs'] });
      toast.success('Office/Branch updated');
    },
    onError: (error) => {
      toast.error('Failed to update office: ' + error.message);
    },
  });
}

export function useDeleteSubLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sub_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations-with-subs'] });
      toast.success('Office/Branch deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete office: ' + error.message);
    },
  });
}
