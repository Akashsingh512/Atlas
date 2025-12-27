import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { useLeads } from '@/hooks/useLeads';
import { useUsers } from '@/hooks/useUsers';
import { useLocations } from '@/hooks/useLocations';
import OverdueSection from '@/components/dashboard/OverdueSection';
import TodaySummaryCards from '@/components/dashboard/TodaySummaryCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LEAD_STATUS_CONFIG, LeadStatus } from '@/types';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Users, MapPin, FileText, BarChart3, 
  Phone, CheckCircle, XCircle, Clock, Loader2
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, isAdmin } = useAuth();
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: users } = useUsers();
  const { data: locations } = useLocations();

  // Invalidate overdue queries on dashboard load to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['overdue-summary'] });
    queryClient.invalidateQueries({ queryKey: ['overdue-statuses'] });
  }, [queryClient]);

  // Calculate stats
  const stats = {
    total: leads?.length || 0,
    open: leads?.filter(l => l.status === 'open').length || 0,
    follow_up: leads?.filter(l => l.status === 'follow_up').length || 0,
    closed: leads?.filter(l => l.status === 'closed').length || 0,
    junk: leads?.filter(l => l.status === 'junk').length || 0,
    future: leads?.filter(l => l.status === 'future').length || 0,
  };

  const conversionRate = stats.total > 0 
    ? ((stats.closed / stats.total) * 100).toFixed(1) 
    : '0';

  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: FileText, color: 'text-primary' },
    { label: 'Open', value: stats.open, icon: Clock, color: 'text-status-open' },
    { label: 'Follow-ups', value: stats.follow_up, icon: Phone, color: 'text-status-follow-up' },
    { label: 'Closed', value: stats.closed, icon: CheckCircle, color: 'text-status-closed' },
  ];

  if (leadsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Welcome */}
        <div className="animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage your team and track all leads' : 'Track and manage your assigned leads'}
          </p>
        </div>

        {/* Overdue Section - Priority */}
        <OverdueSection />

        {/* Today's Summary */}
        <TodaySummaryCards />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <Card key={stat.label} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin-only stats */}
        {isAdmin && (
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conversion Rate
                </CardTitle>
                <BarChart3 className="w-4 h-4 text-status-closed" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.closed} closed / {stats.total} total
                </p>
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Team Members
                </CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {users?.filter(u => u.is_active).length || 0} active
                </p>
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Locations
                </CardTitle>
                <MapPin className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{locations?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {locations?.filter(l => l.is_active).length || 0} active
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Breakdown */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <CardHeader>
            <CardTitle className="text-base">Lead Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => {
                const count = leads?.filter(l => l.status === key).length || 0;
                return (
                  <div 
                    key={key} 
                    className="p-3 rounded-lg border text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate('/leads')}
                  >
                    <Badge variant={config.color as any} className="mb-2">
                      {config.label}
                    </Badge>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="gradient" className="gap-2" onClick={() => navigate('/leads')}>
              <FileText className="w-4 h-4" /> View All Leads
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/meetings')}>
              <TrendingUp className="w-4 h-4" /> Meetings
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => navigate('/users')}>
                  <Users className="w-4 h-4" /> Manage Users
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => navigate('/bulk-upload')}>
                  <MapPin className="w-4 h-4" /> Bulk Upload
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => navigate('/analytics')}>
                  <BarChart3 className="w-4 h-4" /> Analytics
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Getting Started (show if no leads) */}
        {stats.total === 0 && (
          <Card className="border-primary/20 bg-primary/5 animate-slide-up" style={{ animationDelay: '0.45s' }}>
            <CardContent className="pt-6">
              <p className="text-sm">
                <strong>Getting Started:</strong>{' '}
                {isAdmin 
                  ? 'Start by adding locations, then create or import leads. Assign team members to manage leads.'
                  : 'Contact your administrator to assign you to locations and leads.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
