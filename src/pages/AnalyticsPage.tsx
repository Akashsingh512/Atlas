import AppLayout from '@/components/layout/AppLayout';
import { useLeads } from '@/hooks/useLeads';
import { useUsers } from '@/hooks/useUsers';
import { useLocations } from '@/hooks/useLocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LEAD_STATUS_CONFIG, LeadStatus } from '@/types';
import { Loader2, TrendingUp, Users, MapPin, BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: users } = useUsers();
  const { data: locations } = useLocations();

  if (leadsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Calculate stats
  const totalLeads = leads?.length || 0;
  const closedLeads = leads?.filter(l => l.status === 'closed').length || 0;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';

  // Leads by status
  const leadsByStatus = Object.keys(LEAD_STATUS_CONFIG).map(status => ({
    status: status as LeadStatus,
    count: leads?.filter(l => l.status === status).length || 0,
    config: LEAD_STATUS_CONFIG[status as LeadStatus],
  }));

  // Leads by location
  const leadsByLocation = locations?.map(loc => ({
    location: loc,
    count: leads?.filter(l => l.location_id === loc.id).length || 0,
  })).sort((a, b) => b.count - a.count) || [];

  // User performance
  const userPerformance = users?.map(user => {
    const userLeads = leads?.filter(l => l.assigned_to === user.user_id) || [];
    return {
      user,
      assigned: userLeads.length,
      closed: userLeads.filter(l => l.status === 'closed').length,
      follow_up: userLeads.filter(l => l.status === 'follow_up').length,
      junk: userLeads.filter(l => l.status === 'junk').length,
    };
  }).sort((a, b) => b.assigned - a.assigned) || [];

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Performance insights and lead analytics
          </p>
        </div>

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
              <p className="text-xs text-muted-foreground">{closedLeads} closed</p>
            </CardContent>
          </Card>

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
