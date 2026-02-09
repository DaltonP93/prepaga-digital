
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { useCompanies } from "@/hooks/useCompanies";
import { PermissionManager } from "./PermissionManager";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: Profile | null;
}

interface UserFormData {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'auditor' | 'gestor' | 'vendedor';
  company_id: string;
}

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
  const { data: companies = [] } = useCompanies();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEditing = !!user;
  const [activeTab, setActiveTab] = useState("basic");

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UserFormData>({
    defaultValues: {
      email: user?.email || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
      role: 'vendedor',
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
        role: 'vendedor', // Role is in user_roles table, not profiles
        company_id: user.company_id || "",
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditing && user) {
        await updateUser.mutateAsync({
          id: user.id,
          ...data
        });
        toast.success('Usuario actualizado exitosamente');
      } else {
        // For create user, password is required
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
      toast.error('Error al guardar el usuario');
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
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="auditor">Auditor</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="super_admin">Super Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <span className="text-sm text-red-500">El rol es requerido</span>
                )}
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
                {errors.company_id && (
                  <span className="text-sm text-red-500">La empresa es requerida</span>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUser.isPending || updateUser.isPending}
                >
                  {(createUser.isPending || updateUser.isPending) ? "Guardando..." : "Guardar"}
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
