
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Eye, EyeOff } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Enums']['user_role'];

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
  role: string;
  company_id?: string;
  phone?: string;
  active: boolean;
}

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
  const { data: companies = [] } = useCompanies();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEditing = !!user;
  
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UserFormData>({
    defaultValues: {
      email: user?.email || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      role: user?.role || "vendedor",
      company_id: user?.company_id || "",
      phone: user?.phone || "",
      active: user?.active ?? true,
    }
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('Avatar subido correctamente');
    } catch (error: any) {
      toast.error('Error al subir el avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditing && user) {
        await updateUser.mutateAsync({
          id: user.id,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role as UserRole,
          company_id: data.company_id,
          phone: data.phone,
          active: data.active,
          avatar_url: avatarUrl,
        });
      } else {
        if (!data.password) {
          throw new Error("La contraseña es requerida para usuarios nuevos");
        }
        await createUser.mutateAsync({
          email: data.email,
          password: data.password,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role as UserRole,
          company_id: data.company_id,
        });
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Usuario" : "Crear Usuario"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} alt="Avatar" />
              <AvatarFallback>
                {watch("first_name") && watch("last_name") 
                  ? getInitials(watch("first_name"), watch("last_name"))
                  : "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center space-x-2 bg-secondary px-3 py-2 rounded-md hover:bg-secondary/80">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {uploading ? "Subiendo..." : "Cambiar Avatar"}
                  </span>
                </div>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password", { required: "La contraseña es requerida" })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {errors.password && (
                <span className="text-sm text-red-500">{errors.password.message}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                {...register("first_name", { required: "El nombre es requerido" })}
              />
              {errors.first_name && (
                <span className="text-sm text-red-500">{errors.first_name.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
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
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={watch("role")} onValueChange={(value) => setValue("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Empresa</Label>
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

          {isEditing && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Usuario Activo</Label>
                <p className="text-sm text-muted-foreground">
                  Desactivar usuario impedirá que pueda acceder al sistema
                </p>
              </div>
              <Switch
                checked={watch("active")}
                onCheckedChange={(checked) => setValue("active", checked)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createUser.isPending || updateUser.isPending}
            >
              {(createUser.isPending || updateUser.isPending) ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
