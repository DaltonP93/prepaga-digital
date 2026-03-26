import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';

const PLACEHOLDERS = [
  { label: 'Empresa', value: '{{companyName}}' },
  { label: 'Cliente', value: '{{clientName}}' },
  { label: 'Nº Contrato', value: '{{contractNumber}}' },
  { label: 'Expiración', value: '{{expirationDate}}' },
  { label: 'URL Firma', value: '{{signatureUrl}}' },
  { label: 'Plan', value: '{{planName}}' },
];

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  signature_link_titular: 'Se envía al titular cuando se genera su enlace de firma',
  signature_link_adherente: 'Se envía a cada adherente cuando se genera su enlace',
  signature_link_contratada: 'Se envía cuando se activa el turno de firma de la empresa',
  reminder_signature: 'Recordatorio manual enviado desde el backoffice',
};

const EXAMPLE_DATA: Record<string, string> = {
  '{{companyName}}': 'Mi Prepaga S.A.',
  '{{clientName}}': 'Juan Pérez',
  '{{contractNumber}}': 'CT-2026-0042',
  '{{expirationDate}}': '10/03/2026 23:59',
  '{{signatureUrl}}': 'https://prepaga.saa.com.py/firmar/abc123',
  '{{planName}}': 'Plan Familiar Plus',
};

export const WhatsAppTemplatesPanel: React.FC = () => {
  const { profile } = useSimpleAuthContext();
  const companyId = profile?.company_id;
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, template_key, name, body, is_active')
        .eq('company_id', companyId)
        .eq('channel', 'whatsapp')
        .order('template_key');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, body, is_active }: { id: string; body: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('email_templates')
        .update({ body, is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', companyId] });
      toast.success('Plantilla actualizada');
      setEditingId(null);
    },
    onError: () => toast.error('Error al guardar'),
  });

  const insertPlaceholder = (placeholder: string) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newBody = editBody.substring(0, start) + placeholder + editBody.substring(end);
    setEditBody(newBody);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + placeholder.length;
    }, 0);
  };

  const renderPreview = (body: string) => {
    let result = body;
    for (const [key, val] of Object.entries(EXAMPLE_DATA)) {
      result = result.split(key).join(val);
    }
    return result;
  };

  if (!companyId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Asigna una empresa a tu perfil para configurar plantillas WhatsApp.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Plantillas de WhatsApp
        </CardTitle>
        <CardDescription>
          Personaliza los mensajes que se envían automáticamente por WhatsApp durante el flujo de firma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando plantillas...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No se encontraron plantillas WhatsApp para esta empresa. Las plantillas base se crean automáticamente al configurar el sistema.
          </p>
        ) : (
          templates.map((tpl: any) => {
            const isEditing = editingId === tpl.id;
            const isPreviewing = showPreview === tpl.id;

            return (
              <div key={tpl.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {TEMPLATE_DESCRIPTIONS[tpl.template_key] || tpl.template_key}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={tpl.is_active ? 'default' : 'secondary'}>
                      {tpl.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {!isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(tpl.id);
                          setEditBody(tpl.body);
                          setEditActive(tpl.is_active);
                          setShowPreview(null);
                        }}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editActive}
                        onCheckedChange={setEditActive}
                        id={`active-${tpl.id}`}
                      />
                      <Label htmlFor={`active-${tpl.id}`}>Activo</Label>
                    </div>

                    <div>
                      <Label>Placeholders</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {PLACEHOLDERS.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            className="text-xs px-2 py-1 rounded-full border bg-muted hover:bg-accent transition-colors"
                            onClick={() => insertPlaceholder(p.value)}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      ref={textareaRef}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={5}
                      className="font-mono text-sm"
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateTemplate.mutate({ id: tpl.id, body: editBody, is_active: editActive })}
                        disabled={updateTemplate.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPreview(isPreviewing ? null : tpl.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {isPreviewing ? 'Ocultar Preview' : 'Preview'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>

                    {isPreviewing && (
                      <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-sm whitespace-pre-wrap">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Vista previa con datos de ejemplo:</p>
                        {renderPreview(editBody)}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                    {tpl.body}
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
