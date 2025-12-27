import { useState } from 'react';
import { useCustomStatuses, useCreateStatus, useUpdateStatus, useDeleteStatus } from '@/hooks/useCustomStatuses';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Tag } from 'lucide-react';

const COLOR_OPTIONS = [
  { value: 'default', label: 'Default (Blue)' },
  { value: 'secondary', label: 'Secondary (Gray)' },
  { value: 'success', label: 'Success (Green)' },
  { value: 'destructive', label: 'Destructive (Red)' },
  { value: 'follow_up', label: 'Follow Up (Orange)' },
  { value: 'outline', label: 'Outline' },
];

export default function StatusConfigTab() {
  const { data: statuses, isLoading } = useCustomStatuses();
  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    color: 'secondary',
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.label) return;
    
    await createStatus.mutateAsync({
      name: formData.name.toLowerCase().replace(/\s+/g, '_'),
      label: formData.label,
      color: formData.color,
    });
    
    setDialogOpen(false);
    setFormData({ name: '', label: '', color: 'secondary' });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Manage lead status options. System statuses cannot be deleted but can be disabled.
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Label (Display Name)</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    label: e.target.value,
                    name: e.target.value.toLowerCase().replace(/\s+/g, '_')
                  }))}
                  placeholder="e.g., Hot Lead"
                />
              </div>
              <div>
                <Label>System Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., hot_lead"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-generated from label</p>
              </div>
              <div>
                <Label>Color</Label>
                <Select value={formData.color} onValueChange={(v) => setFormData(prev => ({ ...prev, color: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={createStatus.isPending || !formData.label}>
                {createStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {statuses?.map((status) => (
          <Card key={status.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <Badge variant={status.color as any}>{status.label}</Badge>
                  {status.is_system && (
                    <span className="text-xs text-muted-foreground">(System)</span>
                  )}
                  {!status.is_active && (
                    <Badge variant="outline" className="text-xs">Disabled</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={status.is_active}
                    onCheckedChange={(checked) => updateStatus.mutate({ 
                      id: status.id, 
                      data: { is_active: checked } 
                    })}
                    disabled={updateStatus.isPending}
                  />
                  {!status.is_system && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteStatus.mutate(status.id)}
                      disabled={deleteStatus.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
