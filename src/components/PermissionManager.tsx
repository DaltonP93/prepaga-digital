
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAvailablePermissions, useUserPermissionsWithDetails, useUpdateUserPermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface PermissionManagerProps {
  userId: string;
  userName: string;
}

export function PermissionManager({ userId, userName }: PermissionManagerProps) {
  const { data: availablePermissions = [], isLoading: permissionsLoading } = useAvailablePermissions();
  const { data: userPermissions = [], isLoading: userPermissionsLoading } = useUserPermissionsWithDetails(userId);
  const updatePermissions = useUpdateUserPermissions();

  const [selectedPermissions, setSelectedPermissions] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (Array.isArray(userPermissions)) {
      const permissionMap = userPermissions.reduce((acc, perm) => {
        acc[perm.permission_key] = perm.granted;
        return acc;
      }, {} as { [key: string]: boolean });
      
      setSelectedPermissions(permissionMap);
    }
  }, [userPermissions]);

  const handlePermissionChange = (permissionKey: string, granted: boolean) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [permissionKey]: granted
    }));
  };

  const handleSave = async () => {
    const permissions = Object.entries(selectedPermissions).map(([key, granted]) => ({
      permission_key: key,
      granted
    }));

    await updatePermissions.mutateAsync({ userId, permissions });
  };

  const groupedPermissions = availablePermissions.reduce((groups, permission) => {
    const category = permission.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as { [key: string]: typeof availablePermissions });

  if (permissionsLoading || userPermissionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando permisos...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permisos para {userName}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configura qué funcionalidades puede acceder este usuario
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedPermissions).map(([category, permissions]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium capitalize">{category}</h3>
              <Badge variant="outline">{permissions.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={permission.permission_key}
                    checked={selectedPermissions[permission.permission_key] || false}
                    onCheckedChange={(checked) => 
                      handlePermissionChange(permission.permission_key, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={permission.permission_key}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {permission.permission_name}
                  </label>
                </div>
              ))}
            </div>
            <Separator />
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave}
            disabled={updatePermissions.isPending}
          >
            {updatePermissions.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Guardar Permisos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
