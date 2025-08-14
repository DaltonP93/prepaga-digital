
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Clock, Trash2, Gauge, Palette } from 'lucide-react';
import { TestDataManager } from '@/components/TestDataManager';
import { SessionConfigurationPanel } from '@/components/SessionConfigurationPanel';
import { SystemOptimizationPanel } from '@/components/SystemOptimizationPanel';
import { CacheMonitor } from '@/components/CacheMonitor';
import { CurrencyConfigurationPanel } from '@/components/CurrencyConfigurationPanel';

export default function Settings() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Configuración</h1>
      </div>

      <div className="grid gap-6">
        {/* Fila superior - Configuraciones básicas */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil
              </CardTitle>
              <CardDescription>
                Actualiza tu información personal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Editar Perfil
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
              <CardDescription>
                Configura tus preferencias de notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Configurar Notificaciones
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seguridad
              </CardTitle>
              <CardDescription>
                Gestiona tu seguridad y privacidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Configurar Seguridad
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Configuración de Sesión
              </CardTitle>
              <CardDescription>
                Tiempo de inactividad y cierre automático
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionConfigurationPanel />
            </CardContent>
          </Card>
        </div>

        {/* Segunda fila - Datos y optimización */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <TestDataManager />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Monitor de Cache
              </CardTitle>
              <CardDescription>
                Estado del cache y almacenamiento local
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CacheMonitor />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Limpieza del Sistema
              </CardTitle>
              <CardDescription>
                Herramientas de mantenimiento y optimización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemOptimizationPanel />
            </CardContent>
          </Card>
        </div>

        {/* Tercera fila - Configuración de moneda */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Configuración de Moneda
              </CardTitle>
              <CardDescription>
                Gestiona la moneda y formato de precios de tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencyConfigurationPanel />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
