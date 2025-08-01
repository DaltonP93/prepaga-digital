
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { SecuritySettings } from '@/components/SecuritySettings';
import NotificationSettings from '@/components/NotificationSettings';
import { ProfileLogoutButton } from '@/components/ProfileLogoutButton';
import { useCountries } from '@/hooks/useUsers';

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  avatar_url?: string;
  company_id?: string;
  email?: string;
  theme_preference?: string;
}

const profileSchema = z.object({
  first_name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  last_name: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  phone: z.string().min(9, { message: "El teléfono debe tener al menos 9 caracteres." }),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  city: z.string().min(3, { message: "La ciudad debe tener al menos 3 caracteres." }),
  country: z.string().min(2, { message: "Debe seleccionar un país." }),
});

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();
  const { data: countries } = useCountries();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    }
  });

  const { data: profileData, isLoading, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (profileData) {
      setProfile(profileData as Profile);
      setValue('first_name', profileData.first_name || '');
      setValue('last_name', profileData.last_name || '');
      setValue('phone', profileData.phone || '');
      setValue('address', profileData.address || '');
      setValue('city', profileData.city || '');
      setValue('country', profileData.country || '');
      setIsDarkMode(profileData.theme_preference === 'dark');
      setIsLoadingProfile(false);
    }
  }, [profileData, setValue]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Perfil actualizado",
        description: "Tu perfil ha sido actualizado exitosamente.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: async (theme: string) => {
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('profiles')
        .update({ theme_preference: theme })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Tema actualizado",
        description: "La preferencia de tema ha sido actualizada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const handleThemeChange = (isDark: boolean) => {
    setIsDarkMode(isDark);
    updateThemeMutation.mutate(isDark ? 'dark' : 'light');
  };

  return (
    <Layout title="Perfil">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
          <ProfileLogoutButton />
        </div>

        {!profile && (
          <ProfileCompletionBanner />
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Actualiza tu información personal aquí.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">Nombre</Label>
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="Tu nombre"
                        {...register("first_name")}
                      />
                      {errors.first_name && (
                        <p className="text-red-500 text-sm">{errors.first_name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="last_name">Apellido</Label>
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Tu apellido"
                        {...register("last_name")}
                      />
                      {errors.last_name && (
                        <p className="text-red-500 text-sm">{errors.last_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Tu número de teléfono"
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="Tu dirección"
                      {...register("address")}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Ciudad</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="Tu ciudad"
                        {...register("city")}
                      />
                      {errors.city && (
                        <p className="text-red-500 text-sm">{errors.city.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="country">País</Label>
                      <Select value={watch('country')} onValueChange={(value) => setValue('country', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar país" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries?.map((country) => (
                            <SelectItem key={country.id} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.country && (
                        <p className="text-red-500 text-sm">{errors.country.message}</p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Actualizando..." : "Actualizar Perfil"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferencias</CardTitle>
                <CardDescription>
                  Configura tus preferencias de la aplicación.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme">Tema Oscuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa el tema oscuro para una mejor experiencia visual
                    </p>
                  </div>
                  <Switch
                    id="theme"
                    checked={isDarkMode}
                    onCheckedChange={handleThemeChange}
                    disabled={updateThemeMutation.isPending}
                  />
                </div>
                
                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <Input
                    id="language"
                    type="text"
                    placeholder="Idioma"
                    disabled
                    defaultValue="Español"
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Próximamente disponible
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;
