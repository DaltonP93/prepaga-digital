import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PenTool } from 'lucide-react';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SignatureBlockStyle {
  version: 'v1' | 'v2';
  type: 'digital' | 'electronic' | 'both';
  alignment: 'left' | 'center' | 'right';
  size: 'small' | 'normal' | 'large';
  showDateTime: boolean;
  showCI: boolean;
  showIP: boolean;
}

const DEFAULT_STYLE: SignatureBlockStyle = {
  version: 'v2',
  type: 'electronic',
  alignment: 'left',
  size: 'normal',
  showDateTime: true,
  showCI: true,
  showIP: false,
};

export const SignatureBlockStyleCard: React.FC = () => {
  const { profile } = useSimpleAuthContext();
  const [style, setStyle] = useState<SignatureBlockStyle>(DEFAULT_STYLE);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile?.company_id) return;
    const load = async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('signature_block_style')
        .eq('company_id', profile.company_id)
        .single();
      if (data?.signature_block_style) {
        setStyle({ ...DEFAULT_STYLE, ...(data.signature_block_style as any) });
      }
      setLoaded(true);
    };
    load();
  }, [profile?.company_id]);

  const handleSave = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          company_id: profile.company_id,
          signature_block_style: style as any,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'company_id' });
      if (error) throw error;
      toast.success('Estilo de firma guardado');
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Estilo del Bloque de Firma
          </CardTitle>
          <CardDescription>
            Configura la apariencia del bloque de firma en los documentos generados
          </CardDescription>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Estilo'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Versión del diseño</Label>
            <Select value={style.version} onValueChange={(v) => setStyle(s => ({ ...s, version: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="v1">v1 Clásico</SelectItem>
                <SelectItem value="v2">v2 Moderno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={style.type} onValueChange={(v) => setStyle(s => ({ ...s, type: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="digital">Agregar firma (canvas manuscrita)</SelectItem>
                <SelectItem value="electronic">Firma electrónica (OTP + consentimiento)</SelectItem>
                <SelectItem value="both">Ambas (canvas + electrónica)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {style.type === 'digital' && 'El firmante dibuja su firma sobre el documento (estilo Adobe Sign)'}
              {style.type === 'electronic' && 'El firmante recibe un link, completa OTP y da consentimiento digital'}
              {style.type === 'both' && 'Combina la firma manuscrita en canvas con la validación electrónica'}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Alineación</Label>
            <Select value={style.alignment} onValueChange={(v) => setStyle(s => ({ ...s, alignment: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamaño</Label>
            <Select value={style.size} onValueChange={(v) => setStyle(s => ({ ...s, size: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequeño</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 pt-2">
          <div className="flex items-center gap-2">
            <Switch checked={style.showDateTime} onCheckedChange={(v) => setStyle(s => ({ ...s, showDateTime: v }))} />
            <Label>Mostrar fecha y hora</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={style.showCI} onCheckedChange={(v) => setStyle(s => ({ ...s, showCI: v }))} />
            <Label>Mostrar CI del firmante</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={style.showIP} onCheckedChange={(v) => setStyle(s => ({ ...s, showIP: v }))} />
            <Label>Mostrar IP del firmante</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
