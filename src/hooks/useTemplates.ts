import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppTemplate } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
    enabled: !!user,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; message: string }) => {
      const { data: template, error } = await supabase
        .from('whatsapp_templates')
        .insert([{ ...data, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created');
    },
    onError: (error) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WhatsAppTemplate> }) => {
      const { data: template, error } = await supabase
        .from('whatsapp_templates')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template updated');
    },
    onError: (error) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });
}
