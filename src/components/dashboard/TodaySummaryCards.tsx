import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTodayMeetings } from '@/hooks/useMeetings';
import { useTodayCallbacks } from '@/hooks/useCallbacks';
import { useActiveAnnouncements } from '@/hooks/useAnnouncements';
import { Calendar, PhoneCall, Megaphone, MapPin, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function TodaySummaryCards() {
  const { data: todayMeetings, isLoading: meetingsLoading } = useTodayMeetings();
  const { data: todayCallbacks, isLoading: callbacksLoading } = useTodayCallbacks();
  const { data: announcements, isLoading: announcementsLoading } = useActiveAnnouncements();

  const priorityAnnouncements = announcements?.filter(a => a.priority === 'high' || a.priority === 'urgent') || [];

  return (
    <div className="space-y-4">
      {/* Priority Announcements */}
      {priorityAnnouncements.length > 0 && (
        <Card className="border-accent/30 bg-accent/5 animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-accent text-sm">
              <Megaphone className="w-4 h-4" />
              Important Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {priorityAnnouncements.map((announcement) => (
              <div key={announcement.id} className="p-2 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={announcement.priority === 'urgent' ? 'destructive' : 'secondary'}>
                    {announcement.priority}
                  </Badge>
                  <p className="font-medium text-sm">{announcement.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{announcement.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Today's Meetings */}
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-primary" />
              Today's Meetings
              {todayMeetings && todayMeetings.length > 0 && (
                <Badge variant="secondary">{todayMeetings.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meetingsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !todayMeetings || todayMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No meetings scheduled today</p>
            ) : (
              <div className="space-y-2">
                {todayMeetings.slice(0, 3).map((meeting) => (
                  <div key={meeting.id} className="p-2 bg-secondary/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{meeting.lead?.name}</p>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {meeting.meeting_time}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      {meeting.meeting_place}
                    </div>
                  </div>
                ))}
                {todayMeetings.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{todayMeetings.length - 3} more meetings
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Callbacks */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PhoneCall className="w-4 h-4 text-status-follow-up" />
              Today's Callbacks
              {todayCallbacks && todayCallbacks.length > 0 && (
                <Badge variant="secondary">{todayCallbacks.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callbacksLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !todayCallbacks || todayCallbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No callbacks scheduled today</p>
            ) : (
              <div className="space-y-2">
                {todayCallbacks.slice(0, 3).map((callback) => (
                  <div key={callback.id} className="p-2 bg-secondary/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{callback.lead?.name}</p>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(callback.callback_datetime), 'HH:mm')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{callback.lead?.phone}</p>
                  </div>
                ))}
                {todayCallbacks.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{todayCallbacks.length - 3} more callbacks
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
