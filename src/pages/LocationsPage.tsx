import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { 
  useLocationsWithSubLocations, 
  useCreateLocation, 
  useUpdateLocation, 
  useDeleteLocation,
  useCreateSubLocation,
  useUpdateSubLocation,
  useDeleteSubLocation
} from '@/hooks/useLocations';
import { Location, SubLocation } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MapPin, Plus, Loader2, Pencil, Trash2, Building, ChevronDown, ChevronRight } from 'lucide-react';

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
        <Label htmlFor="name">City Name *</Label>
        <Input 
          id="name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g., Bangalore"
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address / Description</Label>
        <Input 
          id="address" 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          placeholder="Optional description"
        />
      </div>
      {mode === 'edit' && (
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'create' ? 'Create City' : 'Save Changes')}
      </Button>
    </form>
  );
}

function SubLocationForm({ 
  mode, 
  locationId,
  initialData, 
  onSuccess 
}: { 
  mode: 'create' | 'edit';
  locationId: string;
  initialData?: SubLocation;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const createSubLocation = useCreateSubLocation();
  const updateSubLocation = useUpdateSubLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      await createSubLocation.mutateAsync({ location_id: locationId, name, address: address || undefined });
    } else if (initialData) {
      await updateSubLocation.mutateAsync({ 
        id: initialData.id, 
        data: { name, address: address || null, is_active: isActive } 
      });
    }
    onSuccess();
  };

  const isPending = createSubLocation.isPending || updateSubLocation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sub-name">Office / Branch Name *</Label>
        <Input 
          id="sub-name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g., Whitefield Office"
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sub-address">Address</Label>
        <Input 
          id="sub-address" 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          placeholder="Full address"
        />
      </div>
      {mode === 'edit' && (
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'create' ? 'Add Office' : 'Save Changes')}
      </Button>
    </form>
  );
}

function LocationCard({ location }: { location: Location & { sub_locations?: SubLocation[] } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [addSubOpen, setAddSubOpen] = useState(false);
  
  const deleteLocation = useDeleteLocation();
  const deleteSubLocation = useDeleteSubLocation();

  const subLocations = location.sub_locations || [];

  return (
    <Card className="animate-fade-in">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <MapPin className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{location.name}</CardTitle>
              <Badge variant="outline" className="ml-2">
                {subLocations.length} {subLocations.length === 1 ? 'office' : 'offices'}
              </Badge>
            </CollapsibleTrigger>
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
                    <DialogTitle>Edit City</DialogTitle>
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
                    <AlertDialogTitle>Delete city?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the city and all its offices. Leads assigned to this city will be unassigned.
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
          {location.address && (
            <p className="text-sm text-muted-foreground ml-8">{location.address}</p>
          )}
          <Badge variant={location.is_active ? 'secondary' : 'destructive'} className="ml-8 w-fit">
            {location.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 pb-4">
            <div className="ml-8 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">Offices / Branches</h4>
                <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="w-3 h-3" /> Add Office
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Office to {location.name}</DialogTitle>
                    </DialogHeader>
                    <SubLocationForm 
                      mode="create" 
                      locationId={location.id}
                      onSuccess={() => setAddSubOpen(false)} 
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {subLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No offices added yet</p>
              ) : (
                <div className="space-y-2">
                  {subLocations.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{sub.name}</p>
                          {sub.address && (
                            <p className="text-xs text-muted-foreground">{sub.address}</p>
                          )}
                        </div>
                        <Badge variant={sub.is_active ? 'outline' : 'destructive'} className="text-xs">
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Dialog 
                          open={editingSubId === sub.id} 
                          onOpenChange={(open) => setEditingSubId(open ? sub.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Office</DialogTitle>
                            </DialogHeader>
                            <SubLocationForm 
                              mode="edit" 
                              locationId={location.id}
                              initialData={sub}
                              onSuccess={() => setEditingSubId(null)} 
                            />
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete office?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the office. Leads assigned to this office will keep the city but lose office info.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSubLocation.mutate(sub.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function LocationsPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: locations, isLoading } = useLocationsWithSubLocations();

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Locations</h1>
            <p className="text-sm text-muted-foreground">
              Manage cities and their office branches
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" /> Add City
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create City</DialogTitle>
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
              <h3 className="font-semibold mb-1">No cities yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first city to start organizing leads by location.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {locations?.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
