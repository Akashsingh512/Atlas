import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAnalyticsConfig } from './useAnalyticsConfig';
import { AnalyticsData, UserPerformanceData } from '@/types/extended';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';

interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  locationId?: string;
}

export function useAdvancedAnalytics(filters?: AnalyticsFilters) {
  const { isAdmin } = useAuth();
  const { data: analyticsConfig } = useAnalyticsConfig();

  return useQuery({
    queryKey: ['advanced-analytics', filters, analyticsConfig],
    queryFn: async () => {
      let query = supabase.from('leads').select('*');

      // Apply date filters
      if (filters?.startDate) {
        query = query.gte('created_at', startOfDay(parseISO(filters.startDate)).toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', endOfDay(parseISO(filters.endDate)).toISOString());
      }
      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      const totalLeads = leads.length;

      // Status distribution
      const statusDistribution: Record<string, number> = {};
      leads.forEach(lead => {
        statusDistribution[lead.status] = (statusDistribution[lead.status] || 0) + 1;
      });

      // Get config for metrics
      const conversionConfig = analyticsConfig?.find(c => c.metric_name === 'conversion_ratio');
      const closureConfig = analyticsConfig?.find(c => c.metric_name === 'closure_rate');
      const junkConfig = analyticsConfig?.find(c => c.metric_name === 'junk_ratio');

      // Calculate conversion ratio
      const conversionIncluded = conversionConfig?.included_statuses || ['closed'];
      const conversionExcluded = conversionConfig?.excluded_statuses || ['junk', 'future'];
      const actionableLeads = leads.filter(l => !conversionExcluded.includes(l.status));
      const convertedLeads = leads.filter(l => conversionIncluded.includes(l.status));
      const conversionRatio = actionableLeads.length > 0 
        ? (convertedLeads.length / actionableLeads.length) * 100 
        : 0;

      // Calculate closure rate
      const closureIncluded = closureConfig?.included_statuses || ['closed'];
      const closedLeads = leads.filter(l => closureIncluded.includes(l.status));
      const closureRate = totalLeads > 0 
        ? (closedLeads.length / totalLeads) * 100 
        : 0;

      // Calculate junk ratio
      const junkIncluded = junkConfig?.included_statuses || ['junk'];
      const junkLeads = leads.filter(l => junkIncluded.includes(l.status));
      const junkRatio = totalLeads > 0 
        ? (junkLeads.length / totalLeads) * 100 
        : 0;

      // User performance
      const userLeads: Record<string, typeof leads> = {};
      leads.forEach(lead => {
        if (lead.assigned_to) {
          if (!userLeads[lead.assigned_to]) {
            userLeads[lead.assigned_to] = [];
          }
          userLeads[lead.assigned_to].push(lead);
        }
      });

      // Get user profiles
      const userIds = Object.keys(userLeads);
      let profiles: { user_id: string; full_name: string }[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profiles = data || [];
      }

      const userPerformance: UserPerformanceData[] = Object.entries(userLeads).map(([userId, userLeadList]) => {
        const profile = profiles.find(p => p.user_id === userId);
        const closed = userLeadList.filter(l => conversionIncluded.includes(l.status)).length;
        const junk = userLeadList.filter(l => junkIncluded.includes(l.status)).length;
        
        return {
          user_id: userId,
          full_name: profile?.full_name || 'Unknown',
          total_assigned: userLeadList.length,
          closed,
          junk,
          pending: userLeadList.length - closed - junk,
          conversion_rate: userLeadList.length > 0 ? (closed / userLeadList.length) * 100 : 0,
        };
      }).sort((a, b) => b.conversion_rate - a.conversion_rate);

      // Leads by location
      const leadsByLocation: Record<string, number> = {};
      
      // Get location names
      const locationIds = [...new Set(leads.filter(l => l.location_id).map(l => l.location_id!))];
      let locations: { id: string; name: string }[] = [];
      if (locationIds.length > 0) {
        const { data } = await supabase
          .from('locations')
          .select('id, name')
          .in('id', locationIds);
        locations = data || [];
      }

      leads.forEach(lead => {
        if (lead.location_id) {
          const location = locations.find(l => l.id === lead.location_id);
          const name = location?.name || 'Unknown';
          leadsByLocation[name] = (leadsByLocation[name] || 0) + 1;
        }
      });

      return {
        total_leads: totalLeads,
        junk_ratio: junkRatio,
        conversion_ratio: conversionRatio,
        closure_rate: closureRate,
        status_distribution: statusDistribution,
        user_performance: userPerformance,
        leads_by_location: leadsByLocation,
      } as AnalyticsData;
    },
    enabled: isAdmin && !!analyticsConfig,
  });
}

export function useDailyAnalytics() {
  const today = new Date().toISOString().split('T')[0];
  return useAdvancedAnalytics({ startDate: today, endDate: today });
}

export function useMonthlyAnalytics() {
  const now = new Date();
  const start = startOfMonth(now).toISOString().split('T')[0];
  const end = endOfMonth(now).toISOString().split('T')[0];
  return useAdvancedAnalytics({ startDate: start, endDate: end });
}
