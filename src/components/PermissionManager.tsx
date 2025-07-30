
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAvailablePermissions, useUserPermissions, useUpdateUserPermissions } from '@/hooks/usePermissions';
import { Loader2, Save } from 'lucide-react';

interface PermissionManagerProps {
  userId: string;
  userName: string;
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({ userId, userName }) => {
  const { data: availablePermissions = [], isLoading: loadingPermissions } = useAvailablePermissions();
  const { data: userPermissions = [], isLoading: loadingUserPermissions } = useUserPermissions(userId);
  const updatePermissions = useUpdateUserPermissions();
  
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    if (userPermissions.length > 0 && !hasChanges) {
      const permissions: Record<string, boolean> = {};
      userPermissions.forEach(p => {
        permissions[p.permission_key] = p.granted;
      });
      setSelectedPermissions(permissions);
    }
  }, [userPermissions, hasChanges]);

  const handlePermissionChange = (permissionKey: string, granted: boolean) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [permissionKey]: granted
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const permissions = availablePermissions.map(p => ({
      permission_key: p.permission_key,
      granted: selectedPermissions[p.permission_key] || false
    }));

    await updatePermissions.mutateAsync({ userId, permissions });
    setHasChanges(false);
  };

  const getCategoryPermissions = (category: string) => {
    return availablePermissions.filter(p => p.category === category);
  };

  const categories = [...new Set(availablePermissions.map(p => p.category))];

  if (loadingPermissions || loadingUserPermissions) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Permisos</CardTitle>
        <CardDescription>
          Configurar permisos para {userName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {categories.slice(0, 4).map(category => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(category => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="grid gap-4">
                {getCategoryPermissions(category).map(permission => (
                  <div
                    key={permission.permission_key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={permission.permission_key}
                          checked={selectedPermissions[permission.permission_key] || false}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(permission.permission_key, checked as boolean)
                          }
                        />
                        <div>
                          <label
                            htmlFor={permission.permission_key}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {permission.permission_name}
                          </label>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {permission.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {hasChanges && (
          <div className="flex justify-end mt-6 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updatePermissions.isPending}
              className="flex items-center space-x-2"
            >
              {updatePermissions.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Guardar Permisos</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
