
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateUser, useUpdateUser, useResetUserPassword, UserWithRole } from "@/hooks/useUsers";
import { useCompanies } from "@/hooks/useCompanies";
import { PermissionManager } from "./PermissionManager";
import { toast } from "sonner";
import { Key } from "lucide-react";
import { useRolePermissions } from "@/hooks/useRolePermissions";

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithRole | null;
}

interface UserFormData {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'auditor' | 'gestor' | 'vendedor' | 'financiero';
  company_id: string;
}

const getUserRole = (user: UserWithRole | null | undefined): UserFormData['role'] => {
  if (user?.user_roles && user.user_roles.length > 0) {
    return user.user_roles[0].role as UserFormData['role'];
  }
  return 'vendedor';
};

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
  const { data: companies = [] } = useCompanies();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetPassword = useResetUserPassword();
  const { isAdmin, isSuperAdmin } = useRolePermissions();
  const isEditing = !!user;
  const [activeTab, setActiveTab] = useState("basic");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UserFormData>({
    defaultValues: {
      email: user?.email || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
      role: getUserRole(user),
      company_id: user?.company_id || "",
    }
  });

  useEffect(() => {
    if (user) {
      reset({
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        role: getUserRole(user),
        company_id: user.company_id || "",
      });
    }
  }, [user, reset]);

  const canManageUsers = isAdmin || isSuperAdmin;
  const availableRoles: UserFormData['role'][] = isSuperAdmin
    ? ['vendedor', 'auditor', 'supervisor', 'gestor', 'financiero', 'admin', 'super_admin']
    : ['vendedor', 'auditor', 'supervisor', 'gestor', 'financiero', 'admin'];

  const targetCurrentRole = getUserRole(user);
  const canEditThisUser = canManageUsers && (isSuperAdmin || targetCurrentRole !== 'super_admin');

  const onSubmit = async (data: UserFormData) => {
    try {
      if (!canManageUsers) {
        toast.error('No tienes permisos para gestionar usuarios.');
        return;
      }
      if (!canEditThisUser) {
        toast.error('No puedes editar un usuario con rol super admin.');
        return;
      }
      if (data.role === 'super_admin' && !isSuperAdmin) {
        toast.error('Solo un super admin puede asignar el rol super admin.');
        return;
      }

      if (isEditing && user) {
        await updateUser.mutateAsync({
          id: user.id,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          company_id: data.company_id,
          role: data.role,
        });
        toast.success('Usuario actualizado exitosamente');
      } else {
        if (!data.password) {
          toast.error('La contraseña es requerida');
          return;
        }
        await createUser.mutateAsync({
          ...data,
          password: data.password
        });
        toast.success('Usuario creado exitosamente');
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Usuario" : "Crear Usuario"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Información Básica</TabsTrigger>
            <TabsTrigger value="permissions" disabled={!isEditing}>
              Permisos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", { required: "El email es requerido" })}
                  disabled={isEditing}
                />
                {errors.email && (
                  <span className="text-sm text-red-500">{errors.email.message}</span>
                )}
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password", { 
                      required: !isEditing ? "La contraseña es requerida" : false,
                      minLength: { value: 6, message: "La contraseña debe tener al menos 6 caracteres" }
                    })}
                  />
                  {errors.password && (
                    <span className="text-sm text-red-500">{errors.password.message}</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre *</Label>
                  <Input
                    id="first_name"
                    {...register("first_name", { required: "El nombre es requerido" })}
                  />
                  {errors.first_name && (
                    <span className="text-sm text-red-500">{errors.first_name.message}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido *</Label>
                  <Input
                    id="last_name"
                    {...register("last_name", { required: "El apellido es requerido" })}
                  />
                  {errors.last_name && (
                    <span className="text-sm text-red-500">{errors.last_name.message}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={watch("role")} onValueChange={(value: any) => setValue("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role === 'vendedor' && 'Vendedor'}
                        {role === 'auditor' && 'Auditor'}
                        {role === 'supervisor' && 'Supervisor'}
                        {role === 'gestor' && 'Gestor'}
                        {role === 'financiero' && 'Financiero'}
                        {role === 'admin' && 'Administrador'}
                        {role === 'super_admin' && 'Super Administrador'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select value={watch("company_id")} onValueChange={(value) => setValue("company_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isEditing && user && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Cambiar Contraseña
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordReset(!showPasswordReset)}
                    >
                      {showPasswordReset ? "Cancelar" : "Cambiar"}
                    </Button>
                  </div>
                  {showPasswordReset && (
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Nueva contraseña (mín. 6 caracteres)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={newPassword.length < 6 || resetPassword.isPending}
                        onClick={async () => {
                          await resetPassword.mutateAsync({ userId: user.id, newPassword });
                          setNewPassword("");
                          setShowPasswordReset(false);
                        }}
                      >
                        {resetPassword.isPending ? "..." : "Aplicar"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUser.isPending || updateUser.isPending || !canEditThisUser}
                >
                  {(createUser.isPending || updateUser.isPending)
                    ? "Guardando..."
                    : !canEditThisUser
                      ? "Sin permisos"
                      : "Guardar"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="permissions">
            {isEditing && user && (
              <PermissionManager 
                userId={user.id} 
                userName={`${user.first_name} ${user.last_name}`} 
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
