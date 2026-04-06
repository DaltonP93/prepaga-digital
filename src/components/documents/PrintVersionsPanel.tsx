import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Printer, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface PrintVersionsPanelProps {
  documentId: string;
  documentName: string;
}

export const PrintVersionsPanel: React.FC<PrintVersionsPanelProps> = ({ documentId, documentName }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('Actualización de branding');
  const [showForm, setShowForm] = useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['print-versions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_print_versions' as any)
        .select('*, profiles:generated_by(first_name, last_name)')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!documentId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-base-pdf', {
        body: {
          document_id: documentId,
          admin_regeneration: true,
          reason: reason || 'Actualización de branding',
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['print-versions', documentId] });
      toast.success(`Versión de impresión v${data?.version_number || '?'} generada correctamente`);
      setShowForm(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al generar versión de impresión');
    },
  });

  const handleDownload = async (version: any) => {
    if (!version.pdf_url) return;

    // pdf_url format: "bucket:path" or just path
    let bucket = 'documents';
    let path = version.pdf_url;
    if (version.pdf_url.includes(':')) {
      const parts = version.pdf_url.split(':');
      bucket = parts[0];
      path = parts.slice(1).join(':');
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      toast.error('No se pudo generar el enlace de descarga');
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Versiones de Impresión</span>
          {versions.length > 0 && (
            <Badge variant="secondary" className="text-xs">{versions.length}</Badge>
          )}
        </div>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            Nueva versión
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
          <p className="text-xs text-muted-foreground">
            Se generará un nuevo PDF con el branding actual sin afectar el PDF firmado original.
          </p>
          <Input
            placeholder="Motivo de la nueva versión"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              disabled={generateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-1"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Generando...</>
              ) : (
                <><Printer className="h-3 w-3" /> Generar</>
              )}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando versiones...
        </div>
      ) : versions.length > 0 ? (
        <div className="space-y-1">
          {versions.map((v: any) => {
            const profile = v.profiles;
            const generatedByName = profile
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              : 'Sistema';

            return (
              <div
                key={v.id}
                className={`flex items-center justify-between text-sm px-3 py-2 rounded-md border ${
                  v.is_current
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-background'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={v.is_current ? 'default' : 'outline'}
                    className="text-[10px]"
                  >
                    v{v.version_number}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString('es-PY')}
                  </span>
                  <span className="text-xs text-muted-foreground">• {generatedByName}</span>
                  {v.reason && (
                    <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                      — {v.reason}
                    </span>
                  )}
                  {v.is_current && (
                    <Badge variant="outline" className="text-[10px] border-green-300 text-green-600 bg-green-50">
                      Actual
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(v)} className="gap-1">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-1">
          No hay versiones de impresión generadas.
        </p>
      )}
    </div>
  );
};
