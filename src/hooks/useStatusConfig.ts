import { useCustomStatuses } from './useCustomStatuses';
import { LeadStatus, LEAD_STATUS_CONFIG } from '@/types';

export interface StatusConfig {
  name: string;
  label: string;
  color: string;
}

/**
 * Hook that provides dynamic status configuration from custom_statuses table
 * Falls back to hard-coded LEAD_STATUS_CONFIG if custom statuses aren't available
 */
export function useStatusConfig() {
  const { data: customStatuses, isLoading } = useCustomStatuses();

  // Build a map of statuses
  const statusMap: Record<string, StatusConfig> = {};

  // Start with hard-coded statuses as fallback
  Object.entries(LEAD_STATUS_CONFIG).forEach(([key, config]) => {
    statusMap[key] = {
      name: key,
      label: config.label,
      color: config.color,
    };
  });

  // Override with custom statuses if available
  if (customStatuses) {
    customStatuses.forEach(status => {
      statusMap[status.name] = {
        name: status.name,
        label: status.label,
        color: status.color,
      };
    });
  }

  // Get active statuses only (for dropdowns, filters)
  const activeStatuses = customStatuses?.filter(s => s.is_active) || [];

  // Convert to array for iteration
  const statusArray = Object.values(statusMap);

  // Helper function to get config for a specific status
  const getStatusConfig = (status: string): StatusConfig => {
    return statusMap[status] || { name: status, label: status, color: 'secondary' };
  };

  return {
    statusMap,
    statusArray,
    activeStatuses,
    getStatusConfig,
    isLoading,
    // For backwards compatibility
    customStatuses,
  };
}

/**
 * Hook that returns only active statuses for use in forms/filters
 */
export function useActiveStatusOptions() {
  const { activeStatuses, isLoading, getStatusConfig } = useStatusConfig();

  // If no custom statuses, fall back to hardcoded ones
  const options = activeStatuses.length > 0 
    ? activeStatuses.map(s => ({ value: s.name, label: s.label, color: s.color }))
    : Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => ({
        value: key,
        label: config.label,
        color: config.color,
      }));

  return { options, isLoading, getStatusConfig };
}
