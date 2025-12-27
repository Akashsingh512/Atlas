import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAnalyticsConfig, useNotificationConfig, useUpdateAnalyticsConfig, useUpdateNotificationConfig, useUpdateOverdueConfig } from '@/hooks/useAnalyticsConfig';
import { useOverdueConfig } from '@/hooks/useOverdue';
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '@/hooks/useAnnouncements';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LEAD_STATUS_CONFIG } from '@/types';
import { 
  Clock, BarChart3, Bell, Megaphone, Loader2, Plus, Trash2, 
  AlertTriangle, Settings, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

function OverdueConfigTab() {
  const { data: config, isLoading } = useOverdueConfig();
  const updateConfig = useUpdateOverdueConfig();

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Select which lead statuses should be tracked for overdue alerts. 
        Leads with these statuses that haven't been updated in 24 hours will appear in the overdue section.
      </div>
      
      <div className="grid gap-3">
        {config?.map((item) => {
          const statusConfig = LEAD_STATUS_CONFIG[item.status as keyof typeof LEAD_STATUS_CONFIG];
          return (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant={statusConfig?.color as any || 'secondary'}>
                  {statusConfig?.label || item.status}
                </Badge>
                {item.is_overdue_applicable && (
                  <span className="text-xs text-status-follow-up flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Tracked
                  </span>
                )}
              </div>
              <Switch
                checked={item.is_overdue_applicable}
                onCheckedChange={(checked) => updateConfig.mutate({ 
                  status: item.status, 
                  is_overdue_applicable: checked 
                })}
                disabled={updateConfig.isPending}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsConfigTab() {
  const { data: config, isLoading } = useAnalyticsConfig();
  const updateConfig = useUpdateAnalyticsConfig();
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [includedStatuses, setIncludedStatuses] = useState<string[]>([]);
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>([]);

  const handleEdit = (metric: typeof config extends (infer T)[] ? T : never) => {
    setEditingMetric(metric.id);
    setIncludedStatuses(metric.included_statuses || []);
    setExcludedStatuses(metric.excluded_statuses || []);
  };

  const handleSave = () => {
    if (editingMetric) {
      updateConfig.mutate({
        id: editingMetric,
        data: { included_statuses: includedStatuses, excluded_statuses: excludedStatuses }
      });
      setEditingMetric(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Configure which statuses are included or excluded when calculating analytics metrics.
      </div>

      <div className="grid gap-4">
        {config?.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base capitalize flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {metric.metric_name.replace(/_/g, ' ')}
              </CardTitle>
              <CardDescription>{metric.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Included:</span>
                  {metric.included_statuses?.length > 0 ? (
                    metric.included_statuses.map(status => (
                      <Badge key={status} variant="secondary" className="text-xs">
                        {LEAD_STATUS_CONFIG[status as keyof typeof LEAD_STATUS_CONFIG]?.label || status}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">All</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Excluded:</span>
                  {metric.excluded_statuses?.length > 0 ? (
                    metric.excluded_statuses.map(status => (
                      <Badge key={status} variant="outline" className="text-xs">
                        {LEAD_STATUS_CONFIG[status as keyof typeof LEAD_STATUS_CONFIG]?.label || status}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              
              <Dialog open={editingMetric === metric.id} onOpenChange={(open) => !open && setEditingMetric(null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => handleEdit(metric)}>
                    Configure
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure {metric.metric_name.replace(/_/g, ' ')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Include statuses (count towards this metric)</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(LEAD_STATUS_CONFIG).map(([key, cfg]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              id={`inc-${key}`}
                              checked={includedStatuses.includes(key)}
                              onCheckedChange={(checked) => 
                                setIncludedStatuses(prev => 
                                  checked ? [...prev, key] : prev.filter(s => s !== key)
                                )
                              }
                            />
                            <label htmlFor={`inc-${key}`} className="text-sm">{cfg.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Exclude statuses (remove from total)</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(LEAD_STATUS_CONFIG).map(([key, cfg]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              id={`exc-${key}`}
                              checked={excludedStatuses.includes(key)}
                              onCheckedChange={(checked) => 
                                setExcludedStatuses(prev => 
                                  checked ? [...prev, key] : prev.filter(s => s !== key)
                                )
                              }
                            />
                            <label htmlFor={`exc-${key}`} className="text-sm">{cfg.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSave} disabled={updateConfig.isPending}>
                      {updateConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotificationConfigTab() {
  const { data: config, isLoading } = useNotificationConfig();
  const updateConfig = useUpdateNotificationConfig();

  const NOTIFICATION_LABELS: Record<string, { label: string; description: string }> = {
    meeting: { label: 'Meeting Reminders', description: 'Notify users about upcoming and scheduled meetings' },
    overdue: { label: 'Overdue Alerts', description: 'Alert users when leads become overdue' },
    callback: { label: 'Callback Reminders', description: 'Remind users about scheduled callbacks' },
    missed_call: { label: 'Missed Call Alerts', description: 'Notify about missed or not-picked calls' },
    announcement: { label: 'Announcements', description: 'Push announcements to dashboard and notifications' },
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Enable or disable notification types for all users.
      </div>

      <div className="grid gap-3">
        {config?.map((item) => {
          const info = NOTIFICATION_LABELS[item.notification_type];
          return (
            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{info?.label || item.notification_type}</p>
                <p className="text-sm text-muted-foreground">{info?.description}</p>
              </div>
              <Switch
                checked={item.is_enabled}
                onCheckedChange={(checked) => updateConfig.mutate({ 
                  notification_type: item.notification_type, 
                  is_enabled: checked 
                })}
                disabled={updateConfig.isPending}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const { data: announcements, isLoading } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    target_role: null as string | null,
    is_active: true,
  });

  const handleSubmit = async () => {
    await createAnnouncement.mutateAsync({
      ...formData,
      target_user_id: null,
      expires_at: null,
    });
    setDialogOpen(false);
    setFormData({ title: '', message: '', priority: 'normal', target_role: null, is_active: true });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Create and manage announcements for your team.
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} 
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea 
                  value={formData.message} 
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))} 
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Select 
                    value={formData.target_role || 'all'} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, target_role: v === 'all' ? null : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="admin">Admins Only</SelectItem>
                      <SelectItem value="user">Users Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={createAnnouncement.isPending || !formData.title || !formData.message}>
                {createAnnouncement.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {announcements?.map((announcement) => (
          <Card key={announcement.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{announcement.title}</h4>
                    <Badge variant={announcement.priority === 'urgent' ? 'destructive' : announcement.priority === 'high' ? 'secondary' : 'outline'}>
                      {announcement.priority}
                    </Badge>
                    {!announcement.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{announcement.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(announcement.created_at), 'PPp')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Switch
                    checked={announcement.is_active}
                    onCheckedChange={(checked) => updateAnnouncement.mutate({ 
                      id: announcement.id, 
                      data: { is_active: checked } 
                    })}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteAnnouncement.mutate(announcement.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!announcements || announcements.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center">
              <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No announcements yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" /> Admin Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure system behavior, notifications, and analytics
          </p>
        </div>

        <Tabs defaultValue="overdue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overdue" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Overdue</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Announcements</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overdue">
            <Card>
              <CardHeader>
                <CardTitle>Overdue Status Configuration</CardTitle>
                <CardDescription>
                  Define which statuses should trigger overdue alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OverdueConfigTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Metrics Configuration</CardTitle>
                <CardDescription>
                  Customize how metrics like conversion ratio and closure rate are calculated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsConfigTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Control which notification types are enabled system-wide
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationConfigTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>
                  Create and manage announcements for your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnnouncementsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
