import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTickets, useSendTicket, useMarkTicketRead, TicketMessage } from '@/hooks/useTickets';
import { useActiveUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare, Reply, Mail, MailOpen, Plus, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function MessagesPage() {
  const { user, isAdmin } = useAuth();
  const { data: tickets, isLoading } = useTickets();
  const { data: users } = useActiveUsers();
  const sendTicket = useSendTicket();
  const markRead = useMarkTicketRead();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketMessage | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    message: '',
  });

  // Handle deep-linking from notifications
  useEffect(() => {
    const ticketId = searchParams.get('thread');
    if (ticketId && tickets) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        openTicket(ticket);
        setSearchParams({});
      }
    }
  }, [searchParams, tickets]);

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

  const handleReplyInThread = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    
    const otherParticipant = selectedTicket.sender_id === user?.id 
      ? selectedTicket.recipient_id 
      : selectedTicket.sender_id;
    
    await sendTicket.mutateAsync({
      recipient_id: otherParticipant,
      subject: `Re: ${selectedTicket.subject}`,
      message: replyMessage,
      parent_id: selectedTicket.id,
    });
    
    setReplyMessage('');
  };

  const openTicket = (ticket: TicketMessage) => {
    if (ticket.recipient_id === user?.id && !ticket.is_read) {
      markRead.mutate(ticket.id);
    }
    // Mark unread replies as read
    ticket.replies?.forEach(reply => {
      if (reply.recipient_id === user?.id && !reply.is_read) {
        markRead.mutate(reply.id);
      }
    });
    setSelectedTicket(ticket);
  };

  const handleNewMessage = () => {
    setReplyTo(null);
    setFormData({ recipient_id: '', subject: '', message: '' });
    setDialogOpen(true);
  };

  // Any user can message any other user
  const getRecipientOptions = () => {
    return users?.filter(u => u.user_id !== user?.id) || [];
  };

  const filteredTickets = tickets?.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(query) ||
      ticket.sender?.full_name?.toLowerCase().includes(query) ||
      ticket.recipient?.full_name?.toLowerCase().includes(query)
    );
  });

  const getOtherParticipant = (ticket: TicketMessage) => {
    return ticket.sender_id === user?.id ? ticket.recipient?.full_name : ticket.sender?.full_name;
  };

  const hasUnreadInThread = (ticket: TicketMessage) => {
    if (ticket.recipient_id === user?.id && !ticket.is_read) return true;
    return ticket.replies?.some(r => r.recipient_id === user?.id && !r.is_read) || false;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Thread view
  if (selectedTicket) {
    const allMessages = [
      selectedTicket,
      ...(selectedTicket.replies || [])
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
      <AppLayout>
        <div className="p-4 lg:p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{selectedTicket.subject}</h1>
              <p className="text-sm text-muted-foreground">
                Conversation with {getOtherParticipant(selectedTicket)}
              </p>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] pr-4">
            <div className="space-y-4">
              {allMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`p-4 rounded-lg max-w-[80%] ${
                    msg.sender_id === user?.id 
                      ? 'bg-primary/10 ml-auto' 
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {msg.sender_id === user?.id ? 'You' : msg.sender?.full_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4 flex gap-2">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              className="min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReplyInThread();
                }
              }}
            />
            <Button 
              onClick={handleReplyInThread} 
              disabled={sendTicket.isPending || !replyMessage.trim()}
              className="shrink-0"
            >
              {sendTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Inbox view
  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground">
              Communicate with your team members
            </p>
          </div>
          <Button className="gap-2" onClick={handleNewMessage}>
            <Plus className="w-4 h-4" /> New Message
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          {filteredTickets?.map((ticket) => (
            <Card 
              key={ticket.id} 
              onClick={() => openTicket(ticket)} 
              className={`cursor-pointer transition-colors ${
                hasUnreadInThread(ticket) 
                  ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' 
                  : 'hover:bg-muted/50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {hasUnreadInThread(ticket) ? (
                    <Mail className="w-5 h-5 text-primary mt-1 shrink-0" />
                  ) : (
                    <MailOpen className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {getOtherParticipant(ticket)}
                      </span>
                      {hasUnreadInThread(ticket) && (
                        <Badge className="shrink-0">New</Badge>
                      )}
                      {ticket.replies && ticket.replies.length > 0 && (
                        <Badge variant="outline" className="shrink-0">
                          {ticket.replies.length + 1} messages
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm truncate">{ticket.subject}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {ticket.replies && ticket.replies.length > 0 
                        ? ticket.replies[ticket.replies.length - 1].message 
                        : ticket.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(ticket.created_at), 'PP')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!filteredTickets || filteredTickets.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No conversations match your search' : 'No messages yet'}
                </p>
                <Button variant="outline" className="mt-4" onClick={handleNewMessage}>
                  Start a conversation
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* New Message Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setReplyTo(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>To</Label>
                <Select 
                  value={formData.recipient_id} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, recipient_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRecipientOptions().map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name} {u.role ? `(${u.role})` : ''}
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
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  placeholder="Type your message..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSend} 
                disabled={sendTicket.isPending || !formData.recipient_id || !formData.subject || !formData.message}
              >
                {sendTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
