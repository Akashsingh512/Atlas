import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useUsers, useAssignRole, useAssignLocations, useUpdateUserStatus } from '@/hooks/useUsers';
import { useLocations } from '@/hooks/useLocations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AppRole } from '@/types';
import { Search, Loader2, Users, MapPin, Shield, Mail, Phone } from 'lucide-react';

interface EditUserDialogProps {
  user: {
    user_id: string;
    full_name: string;
    email: string;
    role?: AppRole;
    locations?: { id: string; name: string }[];
    is_active: boolean;
  };
  onClose: () => void;
}

function EditUserDialog({ user, onClose }: EditUserDialogProps) {
  const [role, setRole] = useState<AppRole>(user.role || 'user');
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    user.locations?.map(l => l.id) || []
  );
  const [isActive, setIsActive] = useState(user.is_active);

  const { data: locations } = useLocations();
  const assignRole = useAssignRole();
  const assignLocations = useAssignLocations();
  const updateStatus = useUpdateUserStatus();

  const handleSave = async () => {
    await Promise.all([
      assignRole.mutateAsync({ userId: user.user_id, role }),
      assignLocations.mutateAsync({ userId: user.user_id, locationIds: selectedLocations }),
      updateStatus.mutateAsync({ userId: user.user_id, isActive }),
    ]);
    onClose();
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const isPending = assignRole.isPending || assignLocations.isPending || updateStatus.isPending;

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Edit User: {user.full_name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        {/* Role */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Role
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Locations */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Assigned Locations
          </Label>
          <div className="max-h-48 overflow-y-auto space-y-2 p-3 border rounded-lg">
            {locations?.map((location) => (
              <div key={location.id} className="flex items-center gap-2">
                <Checkbox 
                  id={location.id}
                  checked={selectedLocations.includes(location.id)}
                  onCheckedChange={() => toggleLocation(location.id)}
                />
                <label htmlFor={location.id} className="text-sm cursor-pointer">
                  {location.name}
                </label>
              </div>
            ))}
            {!locations?.length && (
              <p className="text-sm text-muted-foreground">No locations available</p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <Label>Active Status</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const { data: users, isLoading } = useUsers();

  const filteredUsers = users?.filter(user => 
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage team members and their permissions
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No users found</h3>
              <p className="text-sm text-muted-foreground">
                Users will appear here when they sign up.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredUsers?.map((user) => (
              <Card key={user.id} className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{user.full_name}</h3>
                        <Badge variant={user.role === 'admin' ? 'admin' : 'user'}>
                          {user.role || 'user'}
                        </Badge>
                        {!user.is_active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        )}
                      </div>
                      {user.locations && user.locations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {user.locations.map((loc) => (
                            <Badge key={loc.id} variant="outline" className="text-xs">
                              <MapPin className="w-2 h-2 mr-1" />
                              {loc.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Dialog 
                      open={editingUser === user.user_id} 
                      onOpenChange={(open) => setEditingUser(open ? user.user_id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">Edit</Button>
                      </DialogTrigger>
                      <EditUserDialog 
                        user={user}
                        onClose={() => setEditingUser(null)}
                      />
                    </Dialog>
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
