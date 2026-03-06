import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PenTool, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { toast } from 'sonner';

function ContratadaSignatureConfigInner() {
  const { profile } = useSimpleAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<string>('auto');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerDni, setSignerDni] = useState('');
  const [signerPhone, setSignerPhone] = useState('');

  useEffect(() => {
    if (profile?.company_id) loadConfig();
  }, [profile?.company_id]);

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('contratada_signature_mode, contratada_signer_name, contratada_signer_email, contratada_signer_dni, contratada_signer_phone')
        .eq('company_id', profile!.company_id!)
        .single();

      if (data) {
        setMode(data.contratada_signature_mode || 'auto');
        setSignerName(data.contratada_signer_name || '');
        setSignerEmail(data.contratada_signer_email || '');
        setSignerDni(data.contratada_signer_dni || '');
        setSignerPhone(data.contratada_signer_phone || '');
      }
    } catch {
      // No config yet
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          contratada_signature_mode: mode,
          contratada_signer_name: signerName || null,
          contratada_signer_email: signerEmail || null,
          contratada_signer_dni: signerDni || null,
          contratada_signer_phone: signerPhone || null,
        })
        .eq('company_id', profile.company_id);

      if (error) throw error;
      toast.success('Configuración de firma contratada guardada');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Modo de firma</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automática (datos de empresa)</SelectItem>
            <SelectItem value="link">Enviar link al representante</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {mode === 'auto'
            ? 'La firma se completa automáticamente con los datos del representante configurado.'
            : 'Se genera un enlace de firma y se envía al email del representante legal.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre del representante</Label>
          <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Nombre completo" />
        </div>
        <div className="space-y-2">
          <Label>Email del representante</Label>
          <Input value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="email@empresa.com" type="email" />
        </div>
        <div className="space-y-2">
          <Label>C.I. / DNI del representante</Label>
          <Input value={signerDni} onChange={e => setSignerDni(e.target.value)} placeholder="Número de documento" />
        </div>
        <div className="space-y-2">
          <Label>Teléfono del representante</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">+595</span>
            <Input value={signerPhone} onChange={e => setSignerPhone(e.target.value)} placeholder="981123456" />
          </div>
          <p className="text-xs text-muted-foreground">
            Número sin el 0 inicial. Se usa para enviar OTP por WhatsApp al representante.
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Guardar configuración
      </Button>
    </div>
  );
}

function ContratadaSignatureConfig() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Firma de la Contratada
        </CardTitle>
        <CardDescription>
          Configura cómo se firma en nombre de la empresa (contratada) en los contratos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ContratadaSignatureConfigInner />
      </CardContent>
    </Card>
  );
}

export { ContratadaSignatureConfig, ContratadaSignatureConfigInner };
