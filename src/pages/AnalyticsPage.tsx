import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useLeads } from '@/hooks/useLeads';
import { useUsers } from '@/hooks/useUsers';
import { useLocations } from '@/hooks/useLocations';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_STATUS_CONFIG, LeadStatus } from '@/types';
import { Loader2, TrendingUp, Users, MapPin, BarChart3, Calendar, Filter } from 'lucide-react';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, isWithinInterval, parseISO } from 'date-fns';

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom' | 'all';

export default function AnalyticsPage() {
  const { isAdmin } = useAuth();
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: users } = useUsers();
  const { data: locations } = useLocations();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Date range calculations
  const getDateRange = useMemo(() => {
    const now = new Date();
    
    switch (datePreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfDay(now) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { 
            start: startOfDay(parseISO(customStartDate)), 
            end: endOfDay(parseISO(customEndDate)) 
          };
        }
        return null;
      case 'all':
      default:
        return null;
    }
  }, [datePreset, customStartDate, customEndDate]);

  // Filter leads by date range
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!getDateRange) return leads;
    
    return leads.filter(lead => {
      const leadDate = parseISO(lead.created_at);
      return isWithinInterval(leadDate, { start: getDateRange.start, end: getDateRange.end });
    });
  }, [leads, getDateRange]);

  if (leadsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Calculate stats from filtered leads
  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => l.status === 'closed').length;
  const junkLeads = filteredLeads.filter(l => l.status === 'junk').length;
  const openLeads = filteredLeads.filter(l => l.status === 'open').length;
  const followUpLeads = filteredLeads.filter(l => l.status === 'follow_up').length;
  const futureLeads = filteredLeads.filter(l => l.status === 'future').length;
  
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';
  const junkRate = totalLeads > 0 ? ((junkLeads / totalLeads) * 100).toFixed(1) : '0';

  // Leads by status
  const leadsByStatus = Object.keys(LEAD_STATUS_CONFIG).map(status => ({
    status: status as LeadStatus,
    count: filteredLeads.filter(l => l.status === status).length,
    config: LEAD_STATUS_CONFIG[status as LeadStatus],
  }));

  // Leads by location
  const leadsByLocation = locations?.map(loc => ({
    location: loc,
    count: filteredLeads.filter(l => l.location_id === loc.id).length,
  })).sort((a, b) => b.count - a.count) || [];

  // User performance
  const userPerformance = users?.map(user => {
    const userLeads = filteredLeads.filter(l => l.assigned_to === user.user_id);
    return {
      user,
      assigned: userLeads.length,
      closed: userLeads.filter(l => l.status === 'closed').length,
      follow_up: userLeads.filter(l => l.status === 'follow_up').length,
      junk: userLeads.filter(l => l.status === 'junk').length,
    };
  }).sort((a, b) => b.assigned - a.assigned) || [];

  const datePresetOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week (from Monday)' },
    { value: 'this_month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Performance insights and lead analytics
            </p>
          </div>
        </div>

        {/* Date Filters - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Date Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm mb-1.5 block">Date Range</Label>
                  <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      {datePresetOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {datePreset === 'custom' && (
                  <>
                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">Start Date</Label>
                      <Input 
                        type="date" 
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">End Date</Label>
                      <Input 
                        type="date" 
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Leads
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversion Rate
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-status-closed" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-muted-foreground">{closedLeads} won</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Junk Rate
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-status-junk" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{junkRate}%</div>
              <p className="text-xs text-muted-foreground">{junkLeads} junk</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Pipeline
              </CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openLeads + followUpLeads + futureLeads}</div>
              <p className="text-xs text-muted-foreground">Open + Follow-up + Future</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team Size
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Locations
              </CardTitle>
              <MapPin className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locations?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Won (Closed)
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-status-closed" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-closed">{closedLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lost (Junk)
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-status-junk" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-junk">{junkLeads}</div>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leadsByStatus.map(({ status, count, config }) => {
                const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{config.label}</span>
                      <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-status-${config.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Leads by Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads by Location</CardTitle>
            </CardHeader>
            <CardContent>
              {leadsByLocation.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No locations yet</p>
              ) : (
                <div className="space-y-3">
                  {leadsByLocation.slice(0, 10).map(({ location, count }) => (
                    <div key={location.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{location.name}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {userPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
              ) : (
                <div className="space-y-3">
                  {userPerformance.slice(0, 10).map(({ user, assigned, closed, follow_up, junk }) => (
                    <div key={user.id} className="p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground">{assigned} leads</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-status-closed">✓ {closed} closed</span>
                        <span className="text-status-follow-up">↻ {follow_up} follow-up</span>
                        <span className="text-status-junk">✗ {junk} junk</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
