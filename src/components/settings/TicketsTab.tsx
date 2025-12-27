import { useState } from 'react';
import { useTickets, useSendTicket, useMarkTicketRead, TicketMessage } from '@/hooks/useTickets';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare, Reply, Mail, MailOpen, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function TicketsTab() {
  const { user, isAdmin } = useAuth();
  const { data: tickets, isLoading } = useTickets();
  const { data: users } = useActiveUsers();
  const sendTicket = useSendTicket();
  const markRead = useMarkTicketRead();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketMessage | null>(null);
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

  const handleReply = (ticket: TicketMessage) => {
    setReplyTo(ticket.id);
    setFormData({
      recipient_id: ticket.sender_id === user?.id ? ticket.recipient_id : ticket.sender_id,
      subject: `Re: ${ticket.subject}`,
      message: '',
    });
    setDialogOpen(true);
  };

  const openTicket = (ticket: TicketMessage) => {
    if (ticket.recipient_id === user?.id && !ticket.is_read) {
      markRead.mutate(ticket.id);
    }
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
  };

  const handleNewMessage = () => {
    setReplyTo(null);
    setFormData({ recipient_id: '', subject: '', message: '' });
    setDialogOpen(true);
  };

  // Get admins for non-admin users to message
  const getRecipientOptions = () => {
    if (isAdmin) {
      // Admin can message any user
      return users?.filter(u => u.user_id !== user?.id) || [];
    } else {
      // Non-admin can message admins only
      return users?.filter(u => u.user_id !== user?.id && u.role === 'admin') || [];
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {isAdmin ? 'Send messages to users and view their replies.' : 'Send messages to admin and view replies.'}
        </div>
        <Button className="gap-2" onClick={handleNewMessage}>
          <Send className="w-4 h-4" /> New Message
        </Button>
      </div>

      <div className="space-y-3">
        {tickets?.map((ticket) => (
          <Card key={ticket.id} onClick={() => openTicket(ticket)} className="cursor-pointer hover:bg-muted/50 transition-colors">
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
                    {ticket.replies && ticket.replies.length > 0 && (
                      <Badge variant="outline">{ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}</Badge>
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
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={(e) => { e.stopPropagation(); openTicket(ticket); }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={(e) => { e.stopPropagation(); handleReply(ticket); }}
                  >
                    <Reply className="w-4 h-4" />
                  </Button>
                </div>
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

      {/* New Message / Reply Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setReplyTo(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{replyTo ? 'Reply to Message' : 'Send New Message'}</DialogTitle>
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
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {getRecipientOptions().map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name} {u.role === 'admin' ? '(Admin)' : ''}
                    </SelectItem>
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
                disabled={!!replyTo}
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

      {/* View Conversation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Original message */}
              {selectedTicket && (
                <div className={`p-4 rounded-lg ${selectedTicket.sender_id === user?.id ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {selectedTicket.sender_id === user?.id ? 'You' : selectedTicket.sender?.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(selectedTicket.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
              )}
              
              {/* Replies */}
              {selectedTicket?.replies?.map((reply) => (
                <div 
                  key={reply.id} 
                  className={`p-4 rounded-lg ${reply.sender_id === user?.id ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {reply.sender_id === user?.id ? 'You' : reply.sender?.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reply.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => { setViewDialogOpen(false); if (selectedTicket) handleReply(selectedTicket); }}>
              <Reply className="w-4 h-4 mr-2" /> Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
