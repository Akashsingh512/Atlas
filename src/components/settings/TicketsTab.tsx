import { useState } from 'react';
import { useTickets, useSendTicket, useMarkTicketRead } from '@/hooks/useTickets';
import { useActiveUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Send, MessageSquare, Reply, Mail, MailOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function TicketsTab() {
  const { user, isAdmin } = useAuth();
  const { data: tickets, isLoading } = useTickets();
  const { data: users } = useActiveUsers();
  const sendTicket = useSendTicket();
  const markRead = useMarkTicketRead();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    message: '',
  });

  const handleSend = async () => {
    if (!formData.recipient_id || !formData.subject || !formData.message) return;
    
    await sendTicket.mutateAsync({
      recipient_id: formData.recipient_id,
      subject: formData.subject,
      message: formData.message,
      parent_id: replyTo || undefined,
    });
    
    setDialogOpen(false);
    setReplyTo(null);
    setFormData({ recipient_id: '', subject: '', message: '' });
  };

  const handleReply = (ticket: any) => {
    setReplyTo(ticket.id);
    setFormData({
      recipient_id: ticket.sender_id === user?.id ? ticket.recipient_id : ticket.sender_id,
      subject: `Re: ${ticket.subject}`,
      message: '',
    });
    setDialogOpen(true);
  };

  const openTicket = (ticket: any) => {
    if (ticket.recipient_id === user?.id && !ticket.is_read) {
      markRead.mutate(ticket.id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {isAdmin ? 'Send messages to users and view their replies.' : 'View messages from admin and send replies.'}
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setReplyTo(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Send className="w-4 h-4" /> New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{replyTo ? 'Reply to Message' : 'Send Message to User'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Recipient</Label>
                  <Select 
                    value={formData.recipient_id} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, recipient_id: v }))}
                    disabled={!!replyTo}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.user_id !== user?.id).map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter subject"
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    placeholder="Enter your message..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSend} disabled={sendTicket.isPending || !formData.recipient_id || !formData.message}>
                  {sendTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {tickets?.map((ticket) => (
          <Card key={ticket.id} onClick={() => openTicket(ticket)} className="cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {ticket.recipient_id === user?.id && !ticket.is_read ? (
                  <Mail className="w-5 h-5 text-primary mt-1" />
                ) : (
                  <MailOpen className="w-5 h-5 text-muted-foreground mt-1" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{ticket.subject}</h4>
                    {ticket.recipient_id === user?.id && !ticket.is_read && (
                      <Badge>New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>
                      {ticket.sender_id === user?.id ? 'To: ' : 'From: '}
                      {ticket.sender_id === user?.id ? ticket.recipient?.full_name : ticket.sender?.full_name}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(ticket.created_at), 'PPp')}</span>
                  </div>
                  
                  {/* Replies */}
                  {ticket.replies && ticket.replies.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-muted space-y-2">
                      {ticket.replies.map((reply) => (
                        <div key={reply.id} className="text-sm">
                          <p className="text-muted-foreground">{reply.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {reply.sender?.full_name} • {format(new Date(reply.created_at), 'PPp')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => { e.stopPropagation(); handleReply(ticket); }}
                >
                  <Reply className="w-4 h-4" /> Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {(!tickets || tickets.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center">
              <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No messages yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reply dialog for non-admin users */}
      {!isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setReplyTo(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reply to Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input value={formData.subject} disabled />
              </div>
              <div>
                <Label>Your Reply</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  placeholder="Enter your reply..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSend} disabled={sendTicket.isPending || !formData.message}>
                {sendTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reply'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
