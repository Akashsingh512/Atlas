import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useLocations, useUserLocations } from '@/hooks/useLocations';
import { useUsers, useAssignLocations } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, MapPin, User, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLocationSettings() {
  const { isAdmin } = useAuth();
  const { data: locations, isLoading: locationsLoading } = useLocations();
  const { data: users, isLoading: usersLoading } = useUsers();
  const assignLocations = useAssignLocations();
  
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Filter to get admin users only
  const adminUsers = users?.filter(u => u.role === 'admin' && u.is_active) || [];

  const handleEditUser = (userId: string, currentLocations: string[]) => {
    setEditingUser(userId);
    setSelectedLocations(currentLocations);
  };

  const handleToggleLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    try {
      await assignLocations.mutateAsync({ 
        userId: editingUser, 
        locationIds: selectedLocations 
      });
      toast.success('Location visibility updated');
      setEditingUser(null);
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setSelectedLocations([]);
  };

  if (!isAdmin) {
    return null;
  }

  if (locationsLoading || usersLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Admin Location Visibility
        </CardTitle>
        <CardDescription>
          Configure which locations each admin user can see. This controls data visibility for admin users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {adminUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No admin users found
          </p>
        ) : (
          <div className="space-y-4">
            {adminUsers.map((adminUser) => {
              const isEditing = editingUser === adminUser.user_id;
              const userLocationIds = adminUser.locations?.map(l => l.id) || [];
              
              return (
                <div 
                  key={adminUser.user_id} 
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{adminUser.full_name}</span>
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    </div>
                    {!isEditing ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditUser(adminUser.user_id, userLocationIds)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSave}
                          disabled={assignLocations.isPending}
                        >
                          {assignLocations.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {locations?.map((location) => (
                        <label 
                          key={location.id}
                          className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-secondary/50"
                        >
                          <Checkbox
                            checked={selectedLocations.includes(location.id)}
                            onCheckedChange={() => handleToggleLocation(location.id)}
                          />
                          <span className="text-sm">{location.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {userLocationIds.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Can see all locations (no restrictions)
                        </span>
                      ) : (
                        <>
                          {locations?.filter(l => userLocationIds.includes(l.id)).map((location) => (
                            <Badge key={location.id} variant="outline">
                              {location.name}
                            </Badge>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          Note: Admins without any location restrictions can see all data. 
          Add location restrictions to limit visibility.
        </p>
      </CardContent>
    </Card>
  );
}