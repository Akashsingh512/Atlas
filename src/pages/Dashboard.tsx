import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, MapPin, Phone, LogOut, BarChart3, FileText, Settings } from 'lucide-react';

export default function Dashboard() {
  const { profile, role, isAdmin, signOut } = useAuth();

  const stats = [
    { label: 'Total Leads', value: '0', icon: FileText, color: 'text-primary' },
    { label: 'Open', value: '0', icon: TrendingUp, color: 'text-status-open' },
    { label: 'Follow-ups', value: '0', icon: Phone, color: 'text-status-follow-up' },
    { label: 'Closed', value: '0', icon: BarChart3, color: 'text-status-closed' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold">LeadFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
              <Badge variant={isAdmin ? 'admin' : 'user'} className="text-xs">
                {role || 'user'}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage your team and track all leads' : 'Track and manage your assigned leads'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
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

        {/* Quick Actions */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {isAdmin && (
              <>
                <Button variant="outline" className="gap-2">
                  <Users className="w-4 h-4" /> Manage Users
                </Button>
                <Button variant="outline" className="gap-2">
                  <MapPin className="w-4 h-4" /> Locations
                </Button>
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" /> Settings
                </Button>
              </>
            )}
            <Button variant="gradient" className="gap-2">
              <FileText className="w-4 h-4" /> View Leads
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardContent className="pt-6">
            <p className="text-sm">
              <strong>Note:</strong> This is a newly created account. 
              {isAdmin 
                ? ' Start by adding locations and team members, then import or create leads.'
                : ' Contact your administrator to assign you to locations and leads.'}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
