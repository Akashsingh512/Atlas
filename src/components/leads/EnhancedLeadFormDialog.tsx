import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations } from '@/hooks/useLocations';
import { useUsers } from '@/hooks/useUsers';
import { useCreateLead } from '@/hooks/useLeads';
import { LEAD_STATUS_CONFIG, LeadStatus } from '@/types';
import { Plus, Loader2 } from 'lucide-react';

const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Plot',
  'Commercial',
  'Penthouse',
  'Duplex',
  'Studio',
  'Other',
];

const LEAD_SOURCES = [
  'Facebook',
  'Google',
  'Instagram',
  'Referral',
  'Website',
  'Walk-in',
  'Cold Call',
  'Other',
];

interface EnhancedLeadFormDialogProps {
  onSuccess?: () => void;
}

export default function EnhancedLeadFormDialog({ onSuccess }: EnhancedLeadFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location_id: '',
    property_type: '',
    budget: '',
    lead_source: '',
    status: 'open' as LeadStatus,
    assigned_to: '',
    notes: '',
  });

  const { data: locations } = useLocations();
  const { data: users } = useUsers();
  const createLead = useCreateLead();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.phone || !formData.location_id || !formData.property_type || !formData.budget) {
      return;
    }

    await createLead.mutateAsync({
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      location_id: formData.location_id,
      lead_source: formData.lead_source || undefined,
      notes: formData.notes || undefined,
      assigned_to: formData.assigned_to || undefined,
      property_type: formData.property_type,
      budget: formData.budget,
      status: formData.status,
    });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      location_id: '',
      property_type: '',
      budget: '',
      lead_source: '',
      status: 'open',
      assigned_to: '',
      notes: '',
    });
  };

  const activeUsers = users?.filter(u => u.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" className="gap-2">
          <Plus className="w-4 h-4" /> Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Required Fields */}
          <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Required Information</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-sm">Name *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-sm">Phone *</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="location" className="text-sm">Location *</Label>
              <Select 
                value={formData.location_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, location_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.filter(l => l.is_active).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="property_type" className="text-sm">Property Type *</Label>
                <Select 
                  value={formData.property_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, property_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="budget" className="text-sm">Budget *</Label>
                <Input 
                  id="budget" 
                  value={formData.budget} 
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))} 
                  placeholder="e.g., 50L - 1Cr"
                  required 
                />
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Optional Information</p>
            
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="source" className="text-sm">Lead Source</Label>
              <Select 
                value={formData.lead_source} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, lead_source: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* System Fields */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Assignment</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="status" className="text-sm">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as LeadStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="assigned_to" className="text-sm">Assign To</Label>
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
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea 
                id="notes" 
                value={formData.notes} 
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
                rows={2}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createLead.isPending}>
            {createLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
