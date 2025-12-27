import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useMeetings, useUpdateMeeting } from '@/hooks/useMeetings';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, MapPin, User, Phone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const { data: meetings, isLoading } = useMeetings({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    date: dateFilter || undefined,
  });

  const updateMeeting = useUpdateMeeting();

  const handleMarkCompleted = (meetingId: string) => {
    updateMeeting.mutate({ id: meetingId, data: { status: 'completed' } });
  };

  const handleMarkCancelled = (meetingId: string) => {
    updateMeeting.mutate({ id: meetingId, data: { status: 'cancelled' } });
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const getStatusBadge = (status: string, meetingDate: string) => {
    if (status === 'completed') {
      return <Badge variant="closed">Completed</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="junk">Cancelled</Badge>;
    }
    if (isPast(parseISO(meetingDate)) && status === 'scheduled') {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="open">Scheduled</Badge>;
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Meetings</h1>
            <p className="text-sm text-muted-foreground">
              {meetings?.length || 0} meetings
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="sm:w-48"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(dateFilter || statusFilter !== 'all') && (
            <Button 
              variant="ghost" 
              onClick={() => { setDateFilter(''); setStatusFilter('all'); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Meetings List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : meetings?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No meetings found</h3>
              <p className="text-sm text-muted-foreground">
                Schedule meetings from lead detail pages.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {meetings?.map((meeting) => (
              <Card key={meeting.id} className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 
                          className="font-semibold truncate cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/leads/${meeting.lead_id}`)}
                        >
                          {meeting.lead?.name || 'Unknown Lead'}
                        </h3>
                        {getStatusBadge(meeting.status, meeting.meeting_date)}
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{getDateLabel(meeting.meeting_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{meeting.meeting_time.slice(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{meeting.meeting_place}</span>
                        </div>
                        {meeting.lead?.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{meeting.lead.phone}</span>
                          </div>
                        )}
                      </div>

                      {meeting.notes && (
                        <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                          {meeting.notes}
                        </p>
                      )}
                    </div>

                    {meeting.status === 'scheduled' && (
                      <div className="flex gap-2 shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-status-closed hover:text-status-closed"
                          onClick={() => handleMarkCompleted(meeting.id)}
                          disabled={updateMeeting.isPending}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleMarkCancelled(meeting.id)}
                          disabled={updateMeeting.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
