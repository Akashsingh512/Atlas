import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useLead, useFollowUps, useUpdateLead, useAddFollowUp, useDeleteLead } from '@/hooks/useLeads';
import { useTemplates } from '@/hooks/useTemplates';
import { useAuth } from '@/hooks/useAuth';
import MeetingScheduleDialog from '@/components/meetings/MeetingScheduleDialog';
import CallbackScheduleDialog from '@/components/callbacks/CallbackScheduleDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LeadStatus, LEAD_STATUS_CONFIG } from '@/types';
import { 
  ArrowLeft, Phone, MessageCircle, MapPin, User, 
  Clock, Loader2, Send, Trash2, Mail, FileText, Calendar, PhoneCall,
  Building, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const { data: lead, isLoading } = useLead(id!);
  const { data: followUps, isLoading: followUpsLoading } = useFollowUps(id!);
  const { data: templates } = useTemplates();
  
  const updateLead = useUpdateLead();
  const addFollowUp = useAddFollowUp();
  const deleteLead = useDeleteLead();

  const [newComment, setNewComment] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappOpen, setWhatsappOpen] = useState(false);

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
    const message = encodeURIComponent(whatsappMessage || `Hi ${lead.name}, `);
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    setWhatsappOpen(false);
  };

  const handleDelete = async () => {
    await deleteLead.mutateAsync(lead.id);
    navigate('/leads');
  };

  const statusConfig = LEAD_STATUS_CONFIG[lead.status];

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
                          onClick={() => setWhatsappMessage(template.message.replace('{name}', lead.name))}
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
