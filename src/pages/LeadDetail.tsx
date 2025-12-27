import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useLead, useFollowUps, useUpdateLead, useAddFollowUp, useDeleteLead } from '@/hooks/useLeads';
import { useTemplates } from '@/hooks/useTemplates';
import { useAuth } from '@/hooks/useAuth';
import { useActiveUsers, useUsersByRole } from '@/hooks/useUsers';
import { useLeadAssignmentHistory } from '@/hooks/useAssignmentHistory';
import { useLeadMeetings } from '@/hooks/useMeetings';
import { useLeadCallbacks, formatCallbackDateTime } from '@/hooks/useCallbacks';
import MeetingScheduleDialog from '@/components/meetings/MeetingScheduleDialog';
import CallbackScheduleDialog from '@/components/callbacks/CallbackScheduleDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LeadStatus, LEAD_STATUS_CONFIG, ROLE_CONFIG } from '@/types';
import { 
  ArrowLeft, Phone, MessageCircle, MapPin, User, 
  Clock, Loader2, Send, Trash2, Mail, FileText, Calendar, PhoneCall,
  Building, DollarSign, UserPlus, History, ArrowRight, Users
} from 'lucide-react';
import { format } from 'date-fns';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isPreSales, canAssignLeads, role } = useAuth();
  
  const { data: lead, isLoading } = useLead(id!);
  const { data: followUps, isLoading: followUpsLoading } = useFollowUps(id!);
  const { data: templates } = useTemplates();
  const { data: assignmentHistory } = useLeadAssignmentHistory(id!);
  const { data: activeUsers } = useActiveUsers();
  const { data: salesUsers } = useUsersByRole(['sales']);
  const { data: leadMeetings } = useLeadMeetings(id!);
  const { data: leadCallbacks } = useLeadCallbacks(id!);
  
  const updateLead = useUpdateLead();
  const addFollowUp = useAddFollowUp();
  const deleteLead = useDeleteLead();

  const [newComment, setNewComment] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!lead) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold">Lead not found</h2>
          <Button variant="ghost" onClick={() => navigate('/leads')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to leads
          </Button>
        </div>
      </AppLayout>
    );
  }

  const handleStatusChange = async (newStatus: LeadStatus) => {
    await updateLead.mutateAsync({
      id: lead.id,
      data: { status: newStatus },
      oldStatus: lead.status,
    });
  };

  const handleAddFollowUp = async () => {
    if (!newComment.trim()) return;
    await addFollowUp.mutateAsync({ leadId: lead.id, comment: newComment });
    setNewComment('');
  };

  const handleCall = () => {
    window.location.href = `tel:${lead.phone}`;
  };

  const handleWhatsApp = () => {
    // Replace template variables with actual lead data, fallback to "there" if no name
    let finalMessage = whatsappMessage || `Hi ${lead.name || 'there'}, `;
    finalMessage = finalMessage.replace(/\{name\}/g, lead.name || 'there');
    const message = encodeURIComponent(finalMessage);
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    setWhatsappOpen(false);
  };

  const handleDelete = async () => {
    await deleteLead.mutateAsync(lead.id);
    navigate('/leads');
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    await updateLead.mutateAsync({
      id: lead.id,
      data: { assigned_to: selectedAssignee },
    });
    setAssignOpen(false);
    setSelectedAssignee('');
  };

  // All active users can be assigned - no role restrictions
  const getAssignableUsers = () => {
    return activeUsers || [];
  };

  // Any authenticated user can assign leads
  const canAssignThisLead = () => {
    return true;
  };

  const statusConfig = LEAD_STATUS_CONFIG[lead.status];
  const assignableUsers = getAssignableUsers();

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">{lead.phone}</p>
          </div>
          <Badge variant={statusConfig.color as any} className="text-sm">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="call" className="gap-2" onClick={handleCall}>
            <Phone className="w-4 h-4" /> Call
          </Button>
          <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
            <DialogTrigger asChild>
              <Button variant="whatsapp" className="gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send WhatsApp Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {templates && templates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Quick Templates</p>
                    <div className="flex flex-wrap gap-2">
                      {templates.filter(t => t.is_active).map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          size="sm"
                          onClick={() => setWhatsappMessage(template.message.replace(/\{name\}/g, lead.name || 'there'))}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <Textarea
                  placeholder={`Hi ${lead.name}, `}
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="whatsapp" onClick={handleWhatsApp} className="gap-2">
                  <Send className="w-4 h-4" /> Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Schedule Actions */}
        <div className="grid grid-cols-2 gap-2">
          <MeetingScheduleDialog 
            leadId={lead.id} 
            leadName={lead.name}
            trigger={
              <Button variant="outline" className="gap-2 w-full">
                <Calendar className="w-4 h-4" /> Schedule Meeting
              </Button>
            }
          />
          <CallbackScheduleDialog 
            leadId={lead.id} 
            leadName={lead.name}
            trigger={
              <Button variant="outline" className="gap-2 w-full">
                <PhoneCall className="w-4 h-4" /> Schedule Callback
              </Button>
            }
          />
        </div>

        {/* Lead Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
            )}
            {lead.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{lead.location.name}</span>
              </div>
            )}
            {(lead as any).property_type && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span>Property: {(lead as any).property_type}</span>
              </div>
            )}
            {(lead as any).budget && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>Budget: {(lead as any).budget}</span>
              </div>
            )}
            {lead.lead_source && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Source: {lead.lead_source}</span>
              </div>
            )}
            {lead.assigned_user && (
              <div className="flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
                <span>Assigned to: <strong>{lead.assigned_user.full_name}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Created {format(new Date(lead.created_at), 'PPP')}</span>
            </div>
            {lead.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">{lead.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Callbacks */}
        {leadCallbacks && leadCallbacks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PhoneCall className="w-4 h-4" />
                Scheduled Callbacks ({leadCallbacks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leadCallbacks.map((callback) => (
                  <div key={callback.id} className="p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {formatCallbackDateTime(callback.callback_datetime)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned to: {callback.assigned_user?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <Badge variant={callback.status === 'pending' ? 'default' : callback.status === 'completed' ? 'secondary' : 'destructive'}>
                        {callback.status}
                      </Badge>
                    </div>
                    {callback.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{callback.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scheduled Meetings */}
        {leadMeetings && leadMeetings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scheduled Meetings ({leadMeetings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leadMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(meeting.meeting_date), 'PPP')} at {meeting.meeting_time}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {meeting.meeting_place}
                        </p>
                        {meeting.participants && meeting.participants.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Users className="w-3 h-3 inline mr-1" />
                            {meeting.participants.map(p => p.profile?.full_name).filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <Badge variant={meeting.status === 'scheduled' ? 'default' : meeting.status === 'completed' ? 'secondary' : 'destructive'}>
                        {meeting.status}
                      </Badge>
                    </div>
                    {meeting.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{meeting.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {canAssignThisLead() && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Assign Lead
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Assign to User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Lead to User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableUsers.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name} {u.role && `(${ROLE_CONFIG[u.role]?.label || u.role})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAssign} disabled={!selectedAssignee || updateLead.isPending}>
                      {updateLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Assignment History */}
        {assignmentHistory && assignmentHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Assignment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignmentHistory.map((entry) => (
                  <div key={entry.id} className="text-sm p-2 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">
                        {entry.from_user?.full_name || 'Unassigned'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">
                        {entry.to_user?.full_name || 'Unassigned'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {entry.by_user?.full_name || 'System'} • {format(new Date(entry.created_at), 'PPp')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Update */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Follow-ups ({followUps?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new follow-up */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a follow-up comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <Button 
              onClick={handleAddFollowUp} 
              disabled={!newComment.trim() || addFollowUp.isPending}
              className="w-full gap-2"
            >
              {addFollowUp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Add Follow-up
            </Button>

            {/* Follow-up list */}
            {followUpsLoading ? (
              <div className="py-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : followUps?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No follow-ups yet</p>
            ) : (
              <div className="space-y-3 pt-2 border-t">
                {followUps?.map((followUp) => (
                  <div key={followUp.id} className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm">{followUp.comment}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{followUp.creator?.full_name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{format(new Date(followUp.created_at), 'PPp')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete (Admin only) */}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="w-4 h-4" /> Delete Lead
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All follow-ups will also be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </AppLayout>
  );
}