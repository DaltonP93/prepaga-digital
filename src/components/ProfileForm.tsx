
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthContext } from '@/components/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const ProfileForm = () => {
  const { profile, user } = useAuthContext();
  const { updateProfile, isUpdating } = useProfile();
  const { isComplete } = useProfileCompletion();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const wasIncomplete = !isComplete;
    
    updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim() || null,
    });

    // If profile was incomplete and now might be complete, redirect to dashboard
    if (wasIncomplete && firstName.trim() && lastName.trim()) {
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }
  };

  const getInitials = () => {
    const first = firstName || profile?.first_name || '';
    const last = lastName || profile?.last_name || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Mi Perfil</CardTitle>
        {!isComplete && (
          <p className="text-sm text-muted-foreground">
            Completa tu información personal para continuar
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <Button type="button" variant="outline" size="sm">
                Cambiar Foto
              </Button>
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG o GIF. Máximo 10MB.
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground mt-1">
              El email no se puede cambiar
            </p>
          </div>

          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 666 777 888"
            />
          </div>

          <div>
            <Label>Rol</Label>
            <Input
              value={profile?.role || 'vendedor'}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground mt-1">
              El rol es asignado por el administrador
            </p>
          </div>

          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
