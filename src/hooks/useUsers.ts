import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, AppRole } from '@/types';
import { toast } from 'sonner';

export interface UserWithRole extends Profile {
  role?: AppRole;
  locations?: { id: string; name: string }[];
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const { data: userLocations, error: locError } = await supabase
        .from('user_locations')
        .select('*, location:locations(id, name)');

      if (locError) throw locError;

      // Combine data
      const users: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        const userLocs = userLocations
          .filter((ul) => ul.user_id === profile.user_id)
          .map((ul) => ul.location as { id: string; name: string });

        return {
          ...profile,
          role: userRole?.role as AppRole | undefined,
          locations: userLocs,
        };
      });

      return users;
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Delete existing role first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role assigned');
    },
    onError: (error) => {
      toast.error('Failed to assign role: ' + error.message);
    },
  });
}

export function useAssignLocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, locationIds }: { userId: string; locationIds: string[] }) => {
      // Delete existing locations first
      await supabase
        .from('user_locations')
        .delete()
        .eq('user_id', userId);

      // Insert new locations
      if (locationIds.length > 0) {
        const { error } = await supabase
          .from('user_locations')
          .insert(locationIds.map((lid) => ({ user_id: userId, location_id: lid })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Locations assigned');
    },
    onError: (error) => {
      toast.error('Failed to assign locations: ' + error.message);
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}
