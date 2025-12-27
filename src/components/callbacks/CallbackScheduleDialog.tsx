import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { useCreateCallback } from '@/hooks/useCallbacks';
import { PhoneCall, Loader2 } from 'lucide-react';

interface CallbackScheduleDialogProps {
  leadId: string;
  leadName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export default function CallbackScheduleDialog({ leadId, leadName, trigger, onSuccess }: CallbackScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    callback_date: '',
    callback_time: '',
    assigned_to: '',
    notes: '',
  });

  const { data: users } = useUsers();
  const createCallback = useCreateCallback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.callback_date || !formData.callback_time || !formData.assigned_to) {
      return;
    }

    // Create ISO datetime string - treat input as local time
    // The database stores timestamp with time zone, so we need to send a proper ISO string
    const localDateTime = new Date(`${formData.callback_date}T${formData.callback_time}:00`);
    const callback_datetime = localDateTime.toISOString();

    await createCallback.mutateAsync({
      lead_id: leadId,
      callback_datetime,
      assigned_to: formData.assigned_to,
      notes: formData.notes || undefined,
    });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setFormData({
      callback_date: '',
      callback_time: '',
      assigned_to: '',
      notes: '',
    });
  };

  // Only show active users in assignment dropdown
  const activeUsers = users?.filter(u => u.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <PhoneCall className="w-4 h-4" /> Schedule Callback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Callback</DialogTitle>
          <p className="text-sm text-muted-foreground">For lead: {leadName}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="callback_date" className="text-sm">Date *</Label>
              <Input 
                id="callback_date" 
                type="date" 
                value={formData.callback_date} 
                onChange={(e) => setFormData(prev => ({ ...prev, callback_date: e.target.value }))} 
                min={new Date().toISOString().split('T')[0]}
                required 
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="callback_time" className="text-sm">Time *</Label>
              <Input 
                id="callback_time" 
                type="time" 
                value={formData.callback_time} 
                onChange={(e) => setFormData(prev => ({ ...prev, callback_time: e.target.value }))} 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="assigned_to" className="text-sm">Assign To *</Label>
            <Select 
              value={formData.assigned_to} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {activeUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" className="w-full" disabled={createCallback.isPending}>
              {createCallback.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule Callback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}