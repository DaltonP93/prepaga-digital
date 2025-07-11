
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Building, Upload, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useFileUpload } from '@/hooks/useFileUpload';

export const ProfileForm = () => {
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { uploadFile, uploadState } = useFileUpload();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  // Initialize form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No se pudo cargar el perfil.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
  };

  const handleAvatarUpload = async (file: File) => {
    const url = await uploadFile(file, 'avatars', profile.id);
    if (url) {
      updateProfile({ avatar_url: url });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAvatarUpload(file);
    }
  };

  const getInitials = () => {
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Perfil de Usuario</CardTitle>
          <CardDescription>
            Administra tu información personal y configuración de cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="text-lg">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center space-x-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      {uploadState.isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploadState.isUploading ? 'Subiendo...' : 'Cambiar Avatar'}
                    </span>
                  </Button>
                </div>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                disabled={uploadState.isUploading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG o GIF (máx. 10MB)
              </p>
            </div>
          </div>

          <Separator />

          {/* Personal Information Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nombre</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="pl-10"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="last_name">Apellido</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="pl-10"
                    placeholder="Tu apellido"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                El email no se puede cambiar
              </p>
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="pl-10"
                  placeholder="Tu teléfono"
                />
              </div>
            </div>

            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Company Information */}
      {profile.company && (
        <Card>
          <CardHeader>
            <CardTitle>Información de la Empresa</CardTitle>
            <CardDescription>
              Información de la empresa a la que perteneces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{profile.company.name}</p>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                </div>
              </div>

              {profile.company.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{profile.company.email}</p>
                    <p className="text-sm text-muted-foreground">Email corporativo</p>
                  </div>
                </div>
              )}

              {profile.company.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{profile.company.phone}</p>
                    <p className="text-sm text-muted-foreground">Teléfono corporativo</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
