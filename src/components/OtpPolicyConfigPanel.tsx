import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Mail, MessageSquare, Smartphone, Shield, Server, Save, Loader2, Wifi, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import { useOtpPolicy, OtpPolicyConfig } from '@/hooks/useOtpPolicy';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const OtpPolicyConfigPanel: React.FC = () => {
  const { policy, isLoading, updatePolicy, isUpdating } = useOtpPolicy();
  const [formData, setFormData] = useState<OtpPolicyConfig>(policy);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
    if (updated.length === 0) updated.push('email');
    handleChange('allowed_channels', updated);
    // If default channel was removed, reset to first available
    if (!updated.includes(formData.default_channel)) {
      handleChange('default_channel', updated[0]);
    }
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
    setSmtpTestResult(null);
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
        setSmtpTestResult({ success: true, message: data.message || 'Conexión SMTP validada' });
        toast.success('✅ Conexión SMTP exitosa');
      } else {
        setSmtpTestResult({ success: false, message: data?.error || 'No se pudo conectar' });
        toast.error(data?.error || 'No se pudo conectar al servidor SMTP');
      }
    } catch (err: any) {
      setSmtpTestResult({ success: false, message: err.message });
      toast.error(`Error: ${err.message}`);
    } finally {
      setTestingSmtp(false);
    }
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

  const channelOptions = [
    { key: 'email', label: 'Email (Resend)', icon: Mail, desc: 'Envío vía Resend API', badge: 'Predeterminado' },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, desc: 'WhatsApp Business API o QR Session' },
    { key: 'sms', label: 'SMS', icon: Phone, desc: 'Envío vía proveedor SMS configurado' },
    { key: 'smtp', label: 'SMTP Propio', icon: Server, desc: 'Office 365, iRedMail u otro SMTP' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" />
            Política OTP para Firma
          </CardTitle>
          <CardDescription className="text-xs">
            Autenticación multifactor para firma electrónica (ISO 29115)
          </CardDescription>
        </div>
        <Button onClick={handleSave} disabled={isUpdating} size="sm">
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Guardar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* OTP Toggle + Settings Row */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Requerir OTP para firma</Label>
              <p className="text-xs text-muted-foreground">Verificación obligatoria antes de firmar</p>
            </div>
            <Switch
              checked={formData.require_otp_for_signature}
              onCheckedChange={(v) => handleChange('require_otp_for_signature', v)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Longitud OTP</Label>
              <Select
                value={String(formData.otp_length)}
                onValueChange={(v) => handleChange('otp_length', parseInt(v))}
              >
                <SelectTrigger className="h-9">
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
              <Label className="text-xs">Expiración</Label>
              <Select
                value={String(formData.otp_expiration_seconds)}
                onValueChange={(v) => handleChange('otp_expiration_seconds', parseInt(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="120">2 min</SelectItem>
                  <SelectItem value="300">5 min</SelectItem>
                  <SelectItem value="600">10 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Max intentos</Label>
              <Select
                value={String(formData.max_attempts)}
                onValueChange={(v) => handleChange('max_attempts', parseInt(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Channels */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Canales de envío OTP</Label>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Canal por defecto:</Label>
              <Select
                value={formData.default_channel}
                onValueChange={(v) => handleChange('default_channel', v)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formData.allowed_channels?.map(ch => {
                    const opt = channelOptions.find(o => o.key === ch);
                    return opt ? <SelectItem key={ch} value={ch}>{opt.label}</SelectItem> : null;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {channelOptions.map(({ key, label, icon: Icon, desc, badge }) => {
              const active = formData.allowed_channels?.includes(key);
              return (
                <div
                  key={key}
                  className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => toggleChannel(key)}
                >
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{desc}</p>
                  {badge && active && (
                    <Badge variant="secondary" className="mt-1.5 text-[9px] px-1.5 py-0">{badge}</Badge>
                  )}
                  {active && !badge && (
                    <Badge variant="default" className="mt-1.5 text-[9px] px-1.5 py-0">Activo</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Config */}
        {formData.allowed_channels?.includes('whatsapp') && (
          <>
            <Separator />
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp OTP
              </h4>
              <p className="text-xs text-muted-foreground">
                Usa la configuración de WhatsApp API del módulo Integraciones (Meta Business o Sesión QR).
              </p>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Habilitar OTP por WhatsApp</Label>
                <Switch
                  checked={formData.whatsapp_otp_enabled}
                  onCheckedChange={(v) => handleChange('whatsapp_otp_enabled', v)}
                />
              </div>
            </div>
          </>
        )}

        {/* SMS Config */}
        {formData.allowed_channels?.includes('sms') && (
          <>
            <Separator />
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Phone className="h-4 w-4" />
                SMS OTP
              </h4>
              <p className="text-xs text-muted-foreground">
                Usa la configuración SMS del módulo Integraciones (API Key y Sender ID).
                Asegúrate de que el proveedor SMS esté configurado antes de activar este canal.
              </p>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Verifica que SMS API Key y Sender ID estén configurados en Configuración → Integraciones → SMS.
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}

        {/* SMTP Config */}
        {formData.allowed_channels?.includes('smtp') && (
          <>
            <Separator />
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                SMTP Propio
              </h4>
              <p className="text-xs text-muted-foreground">
                Office 365: smtp.office365.com:587 · iRedMail: tu servidor:587
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Host SMTP</Label>
                  <Input
                    className="h-9"
                    value={formData.smtp_host}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                    placeholder="smtp.office365.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Puerto</Label>
                  <Input
                    className="h-9"
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => handleChange('smtp_port', parseInt(e.target.value) || 587)}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Usuario</Label>
                  <Input
                    className="h-9"
                    value={formData.smtp_user}
                    onChange={(e) => handleChange('smtp_user', e.target.value)}
                    placeholder="noreply@tuempresa.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Contraseña</Label>
                  <Input
                    className="h-9"
                    type="password"
                    value={formData.smtp_password_encrypted}
                    onChange={(e) => handleChange('smtp_password_encrypted', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Email remitente</Label>
                  <Input
                    className="h-9"
                    value={formData.smtp_from_address}
                    onChange={(e) => handleChange('smtp_from_address', e.target.value)}
                    placeholder="noreply@tuempresa.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Nombre remitente</Label>
                  <Input
                    className="h-9"
                    value={formData.smtp_from_name}
                    onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                    placeholder="Mi Empresa"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Usar TLS/STARTTLS</Label>
                <Switch
                  checked={formData.smtp_tls}
                  onCheckedChange={(v) => handleChange('smtp_tls', v)}
                />
              </div>
              
              {smtpTestResult && (
                <Alert variant={smtpTestResult.success ? 'default' : 'destructive'}>
                  {smtpTestResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription className="text-xs">{smtpTestResult.message}</AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="w-full"
              >
                {testingSmtp ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Wifi className="h-4 w-4 mr-1" />
                )}
                {testingSmtp ? 'Probando...' : 'Probar conexión SMTP'}
              </Button>
            </div>
          </>
        )}

        {/* Legal note */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <Shield className="h-3.5 w-3.5" />
            Evidencia probatoria
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Cada envío y verificación OTP se registra con hash SHA-256, IP, User Agent, canal y marca de tiempo.
            Cumple ISO 29115 y Ley N° 4017/2010.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
