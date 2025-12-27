import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOverdueSummary } from '@/hooks/useOverdue';
import { LEAD_STATUS_CONFIG } from '@/types';
import { AlertTriangle, Clock, ChevronRight, Loader2 } from 'lucide-react';

export default function OverdueSection() {
  const navigate = useNavigate();
  const { data: overdueSummary, isLoading } = useOverdueSummary();

  if (isLoading) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-destructive" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!overdueSummary || overdueSummary.total_overdue === 0) {
    return (
      <Card className="border-status-closed/30 bg-status-closed/5">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-status-closed/20">
              <Clock className="w-5 h-5 text-status-closed" />
            </div>
            <div>
              <p className="font-medium text-status-closed">All caught up!</p>
              <p className="text-sm text-muted-foreground">No overdue leads today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5 animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Overdue Leads ({overdueSummary.total_overdue})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status breakdown */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(overdueSummary.by_status).map(([status, count]) => {
            const config = LEAD_STATUS_CONFIG[status as keyof typeof LEAD_STATUS_CONFIG];
            return (
              <Badge 
                key={status} 
                variant={config?.color as any || 'secondary'}
                className="gap-1"
              >
                {config?.label || status}: {count}
              </Badge>
            );
          })}
        </div>

        {/* Top overdue leads */}
        <div className="space-y-2">
          {overdueSummary.leads.slice(0, 5).map((lead) => (
            <div 
              key={lead.id}
              className="flex items-center justify-between p-2 bg-background rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => navigate(`/leads/${lead.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{lead.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{lead.phone}</span>
                  <Badge variant={LEAD_STATUS_CONFIG[lead.status]?.color as any} className="text-xs">
                    {LEAD_STATUS_CONFIG[lead.status]?.label}
                  </Badge>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-destructive">{lead.days_overdue}d overdue</p>
              </div>
            </div>
          ))}
        </div>

        {overdueSummary.leads.length > 5 && (
          <Button 
            variant="ghost" 
            className="w-full gap-2 text-destructive hover:text-destructive"
            onClick={() => navigate('/leads')}
          >
            View all {overdueSummary.total_overdue} overdue leads
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Target: Make overdue count ZERO daily
        </p>
      </CardContent>
    </Card>
  );
}
