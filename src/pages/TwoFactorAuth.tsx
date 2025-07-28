
import React from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Smartphone } from 'lucide-react';

export default function TwoFactorAuth() {
  return (
    <Layout title="Autenticación de Dos Factores" description="Configurar 2FA">
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Autenticación de Dos Factores</h1>
        </div>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Configurar 2FA
              </CardTitle>
              <CardDescription>
                Agrega una capa extra de seguridad a tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificación</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>
              
              <Button className="w-full" type="submit">
                Verificar Código
              </Button>

              <div className="text-center text-sm text-gray-600">
                <p>Ingresa el código de 6 dígitos de tu aplicación de autenticación</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
