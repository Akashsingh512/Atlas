import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/hooks/useLocations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MapPin, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';

function LocationForm({ 
  mode, 
  initialData, 
  onSuccess 
}: { 
  mode: 'create' | 'edit';
  initialData?: { id: string; name: string; address?: string; is_active: boolean };
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      await createLocation.mutateAsync({ name, address: address || undefined });
    } else if (initialData) {
      await updateLocation.mutateAsync({ 
        id: initialData.id, 
        data: { name, address: address || null, is_active: isActive } 
      });
    }
    onSuccess();
  };

  const isPending = createLocation.isPending || updateLocation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Location Name *</Label>
        <Input 
          id="name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g., Downtown Office"
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input 
          id="address" 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          placeholder="123 Main St, City"
        />
      </div>
      {mode === 'edit' && (
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'create' ? 'Create Location' : 'Save Changes')}
      </Button>
    </form>
  );
}

export default function LocationsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: locations, isLoading } = useLocations();
  const deleteLocation = useDeleteLocation();

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Locations</h1>
            <p className="text-sm text-muted-foreground">
              Manage office locations and areas
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" /> Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Location</DialogTitle>
              </DialogHeader>
              <LocationForm mode="create" onSuccess={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Locations List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : locations?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No locations yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first location to start organizing leads.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations?.map((location) => (
              <Card key={location.id} className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="font-semibold truncate">{location.name}</h3>
                      </div>
                      {location.address && (
                        <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                      )}
                      <Badge variant={location.is_active ? 'secondary' : 'destructive'} className="mt-2">
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Dialog 
                        open={editingId === location.id} 
                        onOpenChange={(open) => setEditingId(open ? location.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Location</DialogTitle>
                          </DialogHeader>
                          <LocationForm 
                            mode="edit" 
                            initialData={location}
                            onSuccess={() => setEditingId(null)} 
                          />
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete location?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the location. Leads assigned to this location will be unassigned.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteLocation.mutate(location.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
