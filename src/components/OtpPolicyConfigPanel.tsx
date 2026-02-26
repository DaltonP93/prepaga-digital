import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { KeyRound, Mail, MessageSquare, Smartphone, Shield, Server, Save, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useOtpPolicy, OtpPolicyConfig } from '@/hooks/useOtpPolicy';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const OtpPolicyConfigPanel: React.FC = () => {
  const { policy, isLoading, updatePolicy, isUpdating } = useOtpPolicy();
  const [formData, setFormData] = useState<OtpPolicyConfig>(policy);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  useEffect(() => {
    if (policy) setFormData(policy);
  }, [policy]);

  const handleChange = (field: keyof OtpPolicyConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleChannel = (channel: string) => {
    const current = formData.allowed_channels || [];
    const updated = current.includes(channel)
      ? current.filter(c => c !== channel)
      : [...current, channel];
    // Always keep at least email
    if (updated.length === 0) updated.push('email');
    handleChange('allowed_channels', updated);
  };

  const handleSave = () => {
    const { id, company_id, ...updates } = formData;
    updatePolicy(updates);
  };

  const handleTestSmtp = async () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_from_address) {
      toast.error('Completa host, usuario y email remitente antes de probar');
      return;
    }
    setTestingSmtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('signature-otp', {
        body: {
          action: 'test_smtp',
          smtp_host: formData.smtp_host,
          smtp_port: formData.smtp_port,
          smtp_user: formData.smtp_user,
          smtp_password: formData.smtp_password_encrypted,
          smtp_from_address: formData.smtp_from_address,
          smtp_from_name: formData.smtp_from_name || 'Test',
          smtp_tls: formData.smtp_tls,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('✅ Conexión SMTP exitosa');
      } else {
        toast.error(data?.error || 'No se pudo conectar al servidor SMTP');
      }
    } catch (err: any) {
      toast.error(`Error de prueba: ${err.message}`);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestWhatsApp = async () => {
    toast.info('La prueba de WhatsApp depende de la configuración en Integraciones. Verifica que el gateway esté activo.');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Política OTP para Firma
          </CardTitle>
          <CardDescription>
            Configuración de autenticación multifactor para firma electrónica (ISO 29115)
          </CardDescription>
        </div>
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General OTP Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Requerir OTP para firma</Label>
              <p className="text-sm text-muted-foreground">Verificación de identidad obligatoria antes de firmar</p>
            </div>
            <Switch
              checked={formData.require_otp_for_signature}
              onCheckedChange={(v) => handleChange('require_otp_for_signature', v)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="otp_length">Longitud OTP</Label>
              <Select
                value={String(formData.otp_length)}
                onValueChange={(v) => handleChange('otp_length', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 dígitos</SelectItem>
                  <SelectItem value="6">6 dígitos</SelectItem>
                  <SelectItem value="8">8 dígitos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="otp_expiration">Expiración (seg)</Label>
              <Select
                value={String(formData.otp_expiration_seconds)}
                onValueChange={(v) => handleChange('otp_expiration_seconds', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="120">2 minutos</SelectItem>
                  <SelectItem value="300">5 minutos</SelectItem>
                  <SelectItem value="600">10 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max_attempts">Intentos máximos</Label>
              <Select
                value={String(formData.max_attempts)}
                onValueChange={(v) => handleChange('max_attempts', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 intentos</SelectItem>
                  <SelectItem value="5">5 intentos</SelectItem>
                  <SelectItem value="10">10 intentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Channel Configuration */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Canales de envío OTP</Label>
          <p className="text-sm text-muted-foreground">
            Selecciona los canales permitidos para enviar códigos de verificación
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Email Channel */}
            <div
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                formData.allowed_channels?.includes('email')
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => toggleChannel('email')}
            >
              <div className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4" />
                Email (Resend)
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Envío via Resend API. Siempre disponible.
              </p>
              <Badge variant="secondary" className="mt-2 text-[10px]">Predeterminado</Badge>
            </div>

            {/* WhatsApp Channel */}
            <div
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                formData.allowed_channels?.includes('whatsapp')
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => toggleChannel('whatsapp')}
            >
              <div className="flex items-center gap-2 font-medium">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Usa la API de WhatsApp configurada en Integraciones.
              </p>
              {formData.allowed_channels?.includes('whatsapp') && (
                <Badge variant="default" className="mt-2 text-[10px]">Activo</Badge>
              )}
            </div>

            {/* SMTP Channel */}
            <div
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                formData.allowed_channels?.includes('smtp')
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => toggleChannel('smtp')}
            >
              <div className="flex items-center gap-2 font-medium">
                <Server className="h-4 w-4" />
                SMTP Propio
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Office 365, iRedMail u otro servidor SMTP.
              </p>
              {formData.allowed_channels?.includes('smtp') && (
                <Badge variant="default" className="mt-2 text-[10px]">Activo</Badge>
              )}
            </div>
          </div>

          {/* Default channel selector */}
          <div>
            <Label>Canal por defecto</Label>
            <Select
              value={formData.default_channel}
              onValueChange={(v) => handleChange('default_channel', v)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formData.allowed_channels?.includes('email') && (
                  <SelectItem value="email">Email (Resend)</SelectItem>
                )}
                {formData.allowed_channels?.includes('whatsapp') && (
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                )}
                {formData.allowed_channels?.includes('smtp') && (
                  <SelectItem value="smtp">SMTP Propio</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* WhatsApp OTP Config */}
        {formData.allowed_channels?.includes('whatsapp') && (
          <>
            <Separator />
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Configuración WhatsApp OTP
              </h4>
              <p className="text-sm text-muted-foreground">
                Utiliza la configuración de WhatsApp API del módulo de Integraciones. 
                Asegúrate de tener Meta Business API o Twilio configurado.
              </p>
              <div className="flex items-center justify-between">
                <Label>Habilitar OTP por WhatsApp</Label>
                <Switch
                  checked={formData.whatsapp_otp_enabled}
                  onCheckedChange={(v) => handleChange('whatsapp_otp_enabled', v)}
                />
              </div>
            </div>
          </>
        )}

        {/* SMTP Config */}
        {formData.allowed_channels?.includes('smtp') && (
          <>
            <Separator />
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                Configuración SMTP
              </h4>
              <p className="text-sm text-muted-foreground">
                Office 365: smtp.office365.com:587 · iRedMail: tu servidor:587
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Host SMTP</Label>
                  <Input
                    value={formData.smtp_host}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                    placeholder="smtp.office365.com"
                  />
                </div>
                <div>
                  <Label>Puerto</Label>
                  <Input
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => handleChange('smtp_port', parseInt(e.target.value) || 587)}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Usuario SMTP</Label>
                  <Input
                    value={formData.smtp_user}
                    onChange={(e) => handleChange('smtp_user', e.target.value)}
                    placeholder="noreply@tuempresa.com"
                  />
                </div>
                <div>
                  <Label>Contraseña SMTP</Label>
                  <Input
                    type="password"
                    value={formData.smtp_password_encrypted}
                    onChange={(e) => handleChange('smtp_password_encrypted', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email remitente</Label>
                  <Input
                    value={formData.smtp_from_address}
                    onChange={(e) => handleChange('smtp_from_address', e.target.value)}
                    placeholder="noreply@tuempresa.com"
                  />
                </div>
                <div>
                  <Label>Nombre remitente</Label>
                  <Input
                    value={formData.smtp_from_name}
                    onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                    placeholder="Mi Empresa"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Usar TLS/STARTTLS</Label>
                <Switch
                  checked={formData.smtp_tls}
                  onCheckedChange={(v) => handleChange('smtp_tls', v)}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="w-full"
              >
                {testingSmtp ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wifi className="h-4 w-4 mr-2" />
                )}
                {testingSmtp ? 'Probando conexión...' : 'Probar conexión SMTP'}
              </Button>
            </div>
          </>
        )}

        {/* Legal note */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <Shield className="h-4 w-4" />
            Evidencia probatoria
          </div>
          <p className="text-muted-foreground">
            Cada envío y verificación de OTP se registra en <code>signature_identity_verification</code> con 
            hash SHA-256, IP, User Agent, canal utilizado y marca de tiempo. Esto cumple requisitos de 
            ISO 29115 y Ley N° 4017/2010 para autenticación de firmantes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
