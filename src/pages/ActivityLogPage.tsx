import AppLayout from '@/components/layout/AppLayout';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, FileText, User, MapPin, MessageSquare, Settings } from 'lucide-react';
import { format } from 'date-fns';

const entityIcons: Record<string, React.ElementType> = {
  lead: FileText,
  user: User,
  location: MapPin,
  template: MessageSquare,
  default: Settings,
};

const actionColors: Record<string, string> = {
  created: 'bg-status-closed/10 text-status-closed',
  updated: 'bg-status-follow-up/10 text-status-follow-up',
  deleted: 'bg-destructive/10 text-destructive',
};

export default function ActivityLogPage() {
  const { data: logs, isLoading } = useActivityLogs();

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground">
            Track all changes made in the system
          </p>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : logs?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No activity yet</h3>
              <p className="text-sm text-muted-foreground">
                Actions will be logged here as they happen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs?.map((log) => {
                  const Icon = entityIcons[log.entity_type] || entityIcons.default;
                  const actionColor = actionColors[log.action] || 'bg-secondary text-foreground';

                  return (
                    <div key={log.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {log.user?.full_name || 'System'}
                          </span>
                          <Badge className={`text-xs ${actionColor}`}>
                            {log.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.entity_type}
                          </span>
                        </div>
                        {log.new_value && typeof log.new_value === 'object' && 'status' in log.new_value && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Status changed to: <strong>{String(log.new_value.status)}</strong>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
