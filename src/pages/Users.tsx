
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Pencil, UserCheck, UserX } from "lucide-react";
import { UserForm } from "@/components/UserForm";
import { useUsers, useUpdateUser } from "@/hooks/useUsers";
import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

const Users = () => {
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const { data: users = [], isLoading } = useUsers();
  const updateUser = useUpdateUser();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      case 'gestor': return 'secondary';
      case 'vendedor': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'gestor': return 'Gestor';
      case 'vendedor': return 'Vendedor';
      default: return role;
    }
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleToggleUserStatus = async (user: Profile) => {
    await updateUser.mutateAsync({
      id: user.id,
      is_active: !user.is_active,
    });
  };

  const handleCloseForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  if (isLoading) {
    return (
      <Layout title="Gestión de Usuarios" description="Administrar usuarios y roles del sistema">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Gestión de Usuarios" 
      description="Administrar usuarios y roles del sistema"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
            <p className="text-muted-foreground">
              Gestiona los usuarios del sistema y sus roles
            </p>
          </div>
          <Button onClick={() => setShowUserForm(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Agregar Usuario
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <CardDescription>
              {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Vendedor
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.companies?.name || 'Sin empresa'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={user.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                        >
                          {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay usuarios registrados</p>
              </div>
            )}
          </CardContent>
        </Card>

        <UserForm
          open={showUserForm}
          onOpenChange={handleCloseForm}
          user={editingUser}
        />
      </div>
    </Layout>
  );
};

export default Users;
