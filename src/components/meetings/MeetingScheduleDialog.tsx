import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useUsers } from '@/hooks/useUsers';
import { useCreateMeeting } from '@/hooks/useMeetings';
import { Calendar, Loader2 } from 'lucide-react';

interface MeetingScheduleDialogProps {
  leadId: string;
  leadName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export default function MeetingScheduleDialog({ leadId, leadName, trigger, onSuccess }: MeetingScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    meeting_place: '',
    notes: '',
    participant_ids: [] as string[],
  });

  const { data: users } = useUsers();
  const createMeeting = useCreateMeeting();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.meeting_date || !formData.meeting_time || !formData.meeting_place) {
      return;
    }

    await createMeeting.mutateAsync({
      lead_id: leadId,
      meeting_date: formData.meeting_date,
      meeting_time: formData.meeting_time,
      meeting_place: formData.meeting_place,
      notes: formData.notes || undefined,
      participant_ids: formData.participant_ids,
    });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setFormData({
      meeting_date: '',
      meeting_time: '',
      meeting_place: '',
      notes: '',
      participant_ids: [],
    });
  };

  const toggleParticipant = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participant_ids: prev.participant_ids.includes(userId)
        ? prev.participant_ids.filter(id => id !== userId)
        : [...prev.participant_ids, userId],
    }));
  };

  const activeUsers = users?.filter(u => u.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" /> Schedule Meeting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
          <p className="text-sm text-muted-foreground">For lead: {leadName}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="meeting_date" className="text-sm">Date *</Label>
              <Input 
                id="meeting_date" 
                type="date" 
                value={formData.meeting_date} 
                onChange={(e) => setFormData(prev => ({ ...prev, meeting_date: e.target.value }))} 
                min={new Date().toISOString().split('T')[0]}
                required 
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meeting_time" className="text-sm">Time *</Label>
              <Input 
                id="meeting_time" 
                type="time" 
                value={formData.meeting_time} 
                onChange={(e) => setFormData(prev => ({ ...prev, meeting_time: e.target.value }))} 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="meeting_place" className="text-sm">Place *</Label>
            <Input 
              id="meeting_place" 
              value={formData.meeting_place} 
              onChange={(e) => setFormData(prev => ({ ...prev, meeting_place: e.target.value }))} 
              placeholder="e.g., Office, Site Visit, Video Call"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Assign to Users</Label>
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
              {activeUsers.map((user) => (
                <div key={user.user_id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`user-${user.user_id}`}
                    checked={formData.participant_ids.includes(user.user_id)}
                    onCheckedChange={() => toggleParticipant(user.user_id)}
                  />
                  <label 
                    htmlFor={`user-${user.user_id}`} 
                    className="text-sm cursor-pointer"
                  >
                    {user.full_name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-sm">Notes</Label>
            <Textarea 
              id="notes" 
              value={formData.notes} 
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
              rows={2}
              placeholder="Any additional details..."
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={createMeeting.isPending}>
              {createMeeting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule Meeting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
