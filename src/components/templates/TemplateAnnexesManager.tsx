import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface TemplateAttachment {
  id: string;
  template_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  sort_order: number;
  created_at: string;
}

interface TemplateAnnexesManagerProps {
  templateId: string;
}

export function TemplateAnnexesManager({ templateId }: TemplateAnnexesManagerProps) {
  const [attachments, setAttachments] = useState<TemplateAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { profile } = useAuth();

  const fetchAttachments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("template_attachments" as any)
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setAttachments(data as unknown as TemplateAttachment[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (templateId) fetchAttachments();
  }, [templateId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!profile?.company_id) {
      toast.error("No se pudo determinar la empresa. Intente recargar la página.");
      return;
    }

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        // Use company_id as first folder to match storage RLS policies
        const filePath = `${profile.company_id}/template-annexes/${templateId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Error subiendo ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { error: insertError } = await supabase
          .from("template_attachments" as any)
          .insert({
            template_id: templateId,
            file_name: file.name,
            file_url: filePath,
            file_type: file.type || fileExt,
            file_size: file.size,
            sort_order: attachments.length,
          } as any);

        if (insertError) {
          toast.error(`Error guardando ${file.name}: ${insertError.message}`);
        }
      }

      toast.success("Anexos subidos correctamente");
      fetchAttachments();
    } catch (err) {
      toast.error("Error al subir archivos");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (attachment: TemplateAttachment) => {
    const confirm = window.confirm(`¿Eliminar el anexo "${attachment.file_name}"?`);
    if (!confirm) return;

    // Delete from storage
    await supabase.storage.from("documents").remove([attachment.file_url]);

    // Delete from DB
    const { error } = await supabase
      .from("template_attachments" as any)
      .delete()
      .eq("id", attachment.id);

    if (error) {
      toast.error("Error al eliminar anexo");
    } else {
      toast.success("Anexo eliminado");
      fetchAttachments();
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anexos del Template</CardTitle>
        <CardDescription>
          Suba documentos adicionales (PDF, imágenes) que se adjuntarán al paquete de firma.
          Estos anexos se incluirán automáticamente cuando se envíe la documentación al cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Subiendo archivos...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Haga clic para subir anexos</p>
              <p className="text-xs text-muted-foreground">PDF, imágenes, documentos Word</p>
            </>
          )}
        </label>

        {/* Attachments List */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay anexos adjuntos a este template.
          </p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{att.file_name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {att.file_type || 'archivo'}
                      </Badge>
                      {att.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(att.file_size)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(att)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
