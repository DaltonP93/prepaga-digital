import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Trash2, Loader2, FileInput } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
  onContentExtracted?: (htmlContent: string) => void;
}

export function TemplateAnnexesManager({ templateId, onContentExtracted }: TemplateAnnexesManagerProps) {
  const [attachments, setAttachments] = useState<TemplateAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState<string | null>(null);
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
          continue;
        }

        // If it's a PDF or image and we have the callback, try to extract content
        if (onContentExtracted && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
          await extractAndInsertContent(file);
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

  const renderPdfToImages = async (data: ArrayBuffer): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const totalPages = pdf.numPages;
    const imagesHtml: string[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 2; // high-res
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/png");
      imagesHtml.push(
        `<div style="margin-bottom:8px;"><img src="${dataUrl}" alt="Página ${i}" style="max-width:100%;height:auto;border:1px solid #e5e7eb;border-radius:4px;" /></div>`
      );
    }

    return imagesHtml.join("\n");
  };

  const extractAndInsertContent = async (file: File) => {
    if (!onContentExtracted) return;

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          const html = `<img src="${base64}" alt="${file.name}" style="max-width: 100%; height: auto;" />`;
          onContentExtracted(html);
        };
        reader.readAsDataURL(file);
        return;
      }

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const html = await renderPdfToImages(arrayBuffer);
        onContentExtracted(html);
      }
    } catch (err) {
      console.error("Error extracting content:", err);
      toast.error("No se pudo extraer el contenido del documento");
    }
  };

  const handleInsertInEditor = async (attachment: TemplateAttachment) => {
    if (!onContentExtracted) return;
    
    setIsExtracting(attachment.id);
    try {
      const { data: signedUrlData } = await supabase.storage
        .from("documents")
        .createSignedUrl(attachment.file_url, 3600);

      if (!signedUrlData?.signedUrl) {
        toast.error("No se pudo obtener la URL del archivo");
        return;
      }

      const isImage = attachment.file_type?.startsWith('image') || 
                      ['jpg', 'jpeg', 'png', 'webp'].some(ext => attachment.file_name.toLowerCase().endsWith(ext));
      const isPdf = attachment.file_type?.includes('pdf') || attachment.file_name.toLowerCase().endsWith('.pdf');

      const response = await fetch(signedUrlData.signedUrl);
      const blob = await response.blob();

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          const html = `<img src="${base64}" alt="${attachment.file_name}" style="max-width: 100%; height: auto;" />`;
          onContentExtracted(html);
        };
        reader.readAsDataURL(blob);
      } else if (isPdf) {
        const arrayBuffer = await blob.arrayBuffer();
        const html = await renderPdfToImages(arrayBuffer);
        onContentExtracted(html);
      } else {
        toast.info("Este tipo de archivo no puede ser insertado directamente en el editor.");
      }
    } catch (err) {
      console.error("Error inserting content:", err);
      toast.error("Error al cargar el contenido del documento");
    } finally {
      setIsExtracting(null);
    }
  };

  const handleDelete = async (attachment: TemplateAttachment) => {
    const confirm = window.confirm(`¿Eliminar el anexo "${attachment.file_name}"?`);
    if (!confirm) return;

    await supabase.storage.from("documents").remove([attachment.file_url]);

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
    <div className="space-y-4">
      {/* Upload Area */}
      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
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
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-1" />
            <p className="text-sm text-muted-foreground">Subiendo archivos...</p>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
            <p className="text-sm font-medium">Haga clic para subir documentos</p>
            <p className="text-xs text-muted-foreground">PDF, imágenes — se insertarán en el editor</p>
          </>
        )}
      </label>

      {/* Attachments List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No hay documentos adjuntos.
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between border rounded-lg p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{att.file_name}</p>
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
              <div className="flex items-center gap-1 flex-shrink-0">
                {onContentExtracted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertInEditor(att)}
                    disabled={isExtracting === att.id}
                    className="h-7 text-xs gap-1"
                  >
                    {isExtracting === att.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileInput className="h-3 w-3" />
                    )}
                    Insertar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(att)}
                  className="text-destructive hover:text-destructive h-7"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

