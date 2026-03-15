import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Image, File, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTemplateAssets } from "@/hooks/useTemplateAssets";
import { useQueryClient } from "@tanstack/react-query";
import type { TemplateAsset } from "@/types/templateDesigner";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface PdfPageInfo {
  pageNumber: number;
  selected: boolean;
  thumbnailUrl?: string;
  width: number;
  height: number;
}

interface AssetUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  onAssetInserted: (blockId: string) => void;
}

type Step = "upload" | "processing" | "thumbnails" | "select_pages";

export const AssetUploadModal: React.FC<AssetUploadModalProps> = ({
  open,
  onOpenChange,
  templateId,
  onAssetInserted,
}) => {
  const [step, setStep] = useState<Step>("upload");
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [pdfPages, setPdfPages] = useState<PdfPageInfo[]>([]);
  const [pendingAsset, setPendingAsset] = useState<TemplateAsset | null>(null);
  const [pendingCompanyId, setPendingCompanyId] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [inserting, setInserting] = useState(false);

  const { data: existingAssets } = useTemplateAssets(templateId);
  const queryClient = useQueryClient();

  const resetState = () => {
    setStep("upload");
    setStatusText("");
    setErrorText("");
    setPdfPages([]);
    setPendingAsset(null);
    setPendingCompanyId("");
    setPendingFile(null);
    setInserting(false);
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No session");
    return {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  /**
   * Step 1: upload-template-asset
   * Step 2: process-template-asset
   * Step 3: render thumbnails client-side, upload PNGs, update asset pages
   * Step 4: show page selector
   */
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setErrorText("");
      setPendingFile(file);

      try {
        // Step 1: Upload
        setStep("processing");
        setStatusText("Subiendo archivo...");

        const headers = await getAuthHeaders();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // strip data:...;base64,
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-template-asset`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            template_id: templateId,
            file_name: file.name,
            mime_type: file.type,
            file_base64: base64,
          }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

        const asset = uploadData.asset as TemplateAsset;
        const companyId = uploadData.company_id as string;
        setPendingAsset(asset);
        setPendingCompanyId(companyId);

        // Step 2: Process
        setStatusText("Procesando archivo...");

        const processRes = await fetch(`${SUPABASE_URL}/functions/v1/process-template-asset`, {
          method: "POST",
          headers,
          body: JSON.stringify({ asset_id: asset.id }),
        });
        const processData = await processRes.json();
        if (!processRes.ok) throw new Error(processData.error || "Processing failed");

        const processedAsset = processData.asset as TemplateAsset;
        const dbPages = processData.pages || [];
        setPendingAsset(processedAsset);

        // For images: insert block directly
        if (processedAsset.asset_type !== "pdf") {
          await insertBlock(asset.id, []);
          return;
        }

        // Step 3: Generate thumbnails client-side
        setStep("thumbnails");
        setStatusText("Generando previews de páginas...");

        const pageInfos = await generateAndUploadThumbnails(file, asset.id, companyId, dbPages, headers);
        setPdfPages(pageInfos);

        // Step 4: Show page selector
        setStep("select_pages");
        setStatusText("");
      } catch (err: any) {
        console.error("Asset upload flow error:", err);
        setErrorText(err.message || "Error inesperado");
        setStep("upload");
      }
    },
    [templateId]
  );

  /** Render thumbnails via pdf.js, upload PNGs, update template_asset_pages */
  const generateAndUploadThumbnails = async (
    file: File,
    assetId: string,
    companyId: string,
    dbPages: any[],
    _headers: Record<string, string>
  ): Promise<PdfPageInfo[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageInfos: PdfPageInfo[] = [];
    const THUMB_SCALE = 0.5;

    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: THUMB_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png", 0.85)
        );
        const dataUrl = canvas.toDataURL("image/png", 0.85);

        // Upload to standardized path
        const thumbPath = `${companyId}/template-assets/${assetId}/previews/page-${i}.png`;
        await supabase.storage.from("documents").upload(thumbPath, blob, {
          contentType: "image/png",
          upsert: true,
        });

        // Update template_asset_pages row with preview path
        const dbPage = dbPages.find((p: any) => p.page_number === i);
        if (dbPage) {
          await supabase
            .from("template_asset_pages")
            .update({ preview_image_url: thumbPath })
            .eq("id", dbPage.id);
        }

        const origViewport = page.getViewport({ scale: 1 });
        pageInfos.push({
          pageNumber: i,
          selected: true,
          thumbnailUrl: dataUrl,
          width: Math.round(origViewport.width),
          height: Math.round(origViewport.height),
        });
      } catch (err) {
        console.warn(`Failed to render page ${i}:`, err);
        const dbPage = dbPages.find((p: any) => p.page_number === i);
        pageInfos.push({
          pageNumber: i,
          selected: true,
          width: dbPage?.width || 595,
          height: dbPage?.height || 842,
        });
      }
    }

    return pageInfos;
  };

  /** Call insert-template-asset-block edge function */
  const insertBlock = async (assetId: string, selectedPages: number[]) => {
    setInserting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/insert-template-asset-block`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          template_id: templateId,
          asset_id: assetId,
          selected_pages: selectedPages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Block insert failed");

      // Invalidate blocks query so designer refreshes
      queryClient.invalidateQueries({ queryKey: ["template-blocks", templateId] });
      queryClient.invalidateQueries({ queryKey: ["template-assets", templateId] });

      onAssetInserted(data.block.id);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      console.error("Block insert error:", err);
      setErrorText(err.message || "Error al insertar bloque");
      setInserting(false);
    }
  };

  const handleInsertPdfPages = () => {
    if (!pendingAsset) return;
    const selectedPages = pdfPages
      .filter((p) => p.selected)
      .map((p) => p.pageNumber);
    insertBlock(pendingAsset.id, selectedPages);
  };

  const toggleAllPages = (checked: boolean) => {
    setPdfPages((prev) => prev.map((p) => ({ ...p, selected: checked })));
  };

  const togglePage = (pageNumber: number) => {
    setPdfPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const handleSelectExistingAsset = (asset: TemplateAsset) => {
    if (asset.asset_type === "pdf" && asset.status === "ready" && asset.page_count) {
      // For existing ready PDF, go straight to insert
      insertBlock(asset.id, []);
    } else if (asset.status === "ready") {
      insertBlock(asset.id, []);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    disabled: step !== "upload",
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Insertar Documento</DialogTitle>
        </DialogHeader>

        {errorText && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorText}
          </div>
        )}

        {step === "select_pages" && pendingAsset ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{pendingAsset.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {pdfPages.length} páginas detectadas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={pdfPages.every((p) => p.selected)}
                  onCheckedChange={(v) => toggleAllPages(!!v)}
                />
                <span className="text-xs">Todas</span>
              </div>
            </div>

            <ScrollArea className="h-72">
              <div className="grid grid-cols-4 gap-3">
                {pdfPages.map((page) => (
                  <button
                    key={page.pageNumber}
                    type="button"
                    onClick={() => togglePage(page.pageNumber)}
                    className={`relative rounded-md border-2 overflow-hidden transition-all ${
                      page.selected
                        ? "border-primary ring-1 ring-primary"
                        : "border-border opacity-50"
                    }`}
                  >
                    {page.thumbnailUrl ? (
                      <img
                        src={page.thumbnailUrl}
                        alt={`Página ${page.pageNumber}`}
                        className="w-full aspect-[210/297] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[210/297] bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                        {page.pageNumber}
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 text-[9px] font-medium bg-background/80 rounded px-1">
                      {page.pageNumber}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={resetState}>
                Volver
              </Button>
              <Button
                type="button"
                onClick={handleInsertPdfPages}
                disabled={!pdfPages.some((p) => p.selected) || inserting}
              >
                {inserting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Insertando...
                  </>
                ) : (
                  `Insertar ${pdfPages.filter((p) => p.selected).length} páginas`
                )}
              </Button>
            </div>
          </div>
        ) : step === "processing" || step === "thumbnails" ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </div>
        ) : (
          <Tabs defaultValue="upload">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
              <TabsTrigger value="library">Biblioteca</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? "Soltá el archivo aquí"
                      : "Arrastrá un archivo o hacé clic"}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF o imágenes</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="library" className="space-y-4">
              {existingAssets && existingAssets.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {existingAssets.map((asset) => {
                      const AssetIcon =
                        asset.asset_type === "pdf"
                          ? FileText
                          : asset.asset_type === "image"
                          ? Image
                          : File;
                      return (
                        <Card
                          key={asset.id}
                          className="p-3 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectExistingAsset(asset)}
                        >
                          <div className="flex items-center gap-3">
                            <AssetIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {asset.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {asset.asset_type.toUpperCase()}
                                {asset.page_count ? ` · ${asset.page_count} págs` : ""}
                                {asset.status && asset.status !== "ready" && (
                                  <span className="ml-1 text-warning">({asset.status})</span>
                                )}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {asset.asset_type}
                            </Badge>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No hay assets en este template
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
