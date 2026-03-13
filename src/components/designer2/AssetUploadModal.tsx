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
import { Upload, FileText, Image, File, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTemplateAsset, useTemplateAssets, useBulkCreateAssetPages } from "@/hooks/useTemplateAssets";
import type { TemplateAsset, AssetType } from "@/types/templateDesigner";
import * as pdfjsLib from "pdfjs-dist";

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PagePreviewData {
  page_number: number;
  preview_url: string; // signed URL or storage path
  width: number;
  height: number;
}

interface AssetUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  onAssetInserted: (
    asset: TemplateAsset,
    selectedPages?: number[],
    pagePreviews?: PagePreviewData[]
  ) => void;
}

interface PdfPageInfo {
  pageNumber: number;
  selected: boolean;
  thumbnailUrl?: string; // data URL for local preview
}

export const AssetUploadModal: React.FC<AssetUploadModalProps> = ({
  open,
  onOpenChange,
  templateId,
  onAssetInserted,
}) => {
  const [uploading, setUploading] = useState(false);
  const [processingPreviews, setProcessingPreviews] = useState(false);
  const [pdfPages, setPdfPages] = useState<PdfPageInfo[]>([]);
  const [pendingAsset, setPendingAsset] = useState<TemplateAsset | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [pagePreviews, setPagePreviews] = useState<PagePreviewData[]>([]);

  const { data: existingAssets } = useTemplateAssets(templateId);
  const createAsset = useCreateTemplateAsset();
  const bulkCreatePages = useBulkCreateAssetPages();

  const detectAssetType = (mimeType: string): AssetType => {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.includes("word") || mimeType.includes("docx")) return "docx";
    return "attachment";
  };

  /**
   * Generate real thumbnails from PDF pages using pdf.js canvas rendering,
   * upload them to storage, and persist in template_asset_pages.
   */
  const generatePdfPreviews = async (
    file: File,
    assetId: string,
    pageCount: number
  ): Promise<{ pages: PdfPageInfo[]; previews: PagePreviewData[] }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesInfo: PdfPageInfo[] = [];
    const previewsData: PagePreviewData[] = [];
    const assetPageInserts: Array<{
      asset_id: string;
      page_number: number;
      preview_image_url: string;
      width: number;
      height: number;
    }> = [];

    const THUMB_SCALE = 0.5; // render at 50% for thumbnails

    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: THUMB_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert to blob for upload
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png", 0.85)
        );

        // Also create data URL for immediate local preview
        const dataUrl = canvas.toDataURL("image/png", 0.85);

        // Upload thumbnail to storage
        const thumbPath = `template-previews/${templateId}/${assetId}/page-${i}.png`;
        await supabase.storage.from("documents").upload(thumbPath, blob, {
          contentType: "image/png",
          upsert: true,
        });

        // Get signed URL
        const { data: signedData } = await supabase.storage
          .from("documents")
          .createSignedUrl(thumbPath, 3600);

        const signedUrl = signedData?.signedUrl || "";

        // Get original page dimensions
        const originalViewport = page.getViewport({ scale: 1 });

        pagesInfo.push({
          pageNumber: i,
          selected: true,
          thumbnailUrl: dataUrl,
        });

        previewsData.push({
          page_number: i,
          preview_url: signedUrl,
          width: Math.round(originalViewport.width),
          height: Math.round(originalViewport.height),
        });

        assetPageInserts.push({
          asset_id: assetId,
          page_number: i,
          preview_image_url: thumbPath,
          width: Math.round(originalViewport.width),
          height: Math.round(originalViewport.height),
        });
      } catch (err) {
        console.warn(`Failed to render page ${i}:`, err);
        pagesInfo.push({ pageNumber: i, selected: true });
        previewsData.push({
          page_number: i,
          preview_url: "",
          width: 595,
          height: 842,
        });
      }
    }

    // Bulk insert template_asset_pages
    if (assetPageInserts.length > 0) {
      try {
        await bulkCreatePages.mutateAsync(assetPageInserts);
      } catch (err) {
        console.warn("Failed to persist asset pages:", err);
      }
    }

    return { pages: pagesInfo, previews: previewsData };
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setUploadedFileName(file.name);
      setPdfPages([]);
      setPendingAsset(null);
      setPagePreviews([]);

      try {
        const filePath = `template-assets/${templateId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const assetType = detectAssetType(file.type);
        let pageCount: number | null = null;

        if (assetType === "pdf") {
          const ab = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
          pageCount = pdf.numPages;
        }

        const asset = await createAsset.mutateAsync({
          template_id: templateId,
          asset_type: assetType,
          file_name: file.name,
          file_url: filePath,
          mime_type: file.type,
          file_size: file.size,
          page_count: pageCount,
          metadata: {},
        });

        if (assetType === "pdf" && pageCount) {
          setUploading(false);
          setProcessingPreviews(true);

          const { pages, previews } = await generatePdfPreviews(
            file,
            asset.id,
            pageCount
          );

          setPdfPages(pages);
          setPendingAsset(asset);
          setPagePreviews(previews);
          setProcessingPreviews(false);
        } else {
          onAssetInserted(asset);
          onOpenChange(false);
        }
      } catch (err: any) {
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
        setProcessingPreviews(false);
      }
    },
    [templateId, createAsset, onAssetInserted, onOpenChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    disabled: uploading || processingPreviews,
  });

  const handleInsertPdfPages = () => {
    if (!pendingAsset) return;
    const selectedPages = pdfPages
      .filter((p) => p.selected)
      .map((p) => p.pageNumber);
    onAssetInserted(pendingAsset, selectedPages, pagePreviews);
    onOpenChange(false);
    setPdfPages([]);
    setPendingAsset(null);
    setPagePreviews([]);
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
    if (asset.asset_type === "pdf" && asset.page_count) {
      const pages: PdfPageInfo[] = Array.from(
        { length: asset.page_count },
        (_, i) => ({
          pageNumber: i + 1,
          selected: true,
        })
      );
      setPdfPages(pages);
      setPendingAsset(asset);
    } else {
      onAssetInserted(asset);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Insertar Documento</DialogTitle>
        </DialogHeader>

        {pdfPages.length > 0 && pendingAsset ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {uploadedFileName || pendingAsset.file_name}
                </p>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPdfPages([]);
                  setPendingAsset(null);
                  setPagePreviews([]);
                }}
              >
                Volver
              </Button>
              <Button
                type="button"
                onClick={handleInsertPdfPages}
                disabled={!pdfPages.some((p) => p.selected)}
              >
                Insertar {pdfPages.filter((p) => p.selected).length} páginas
              </Button>
            </div>
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
                {uploading || processingPreviews ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {processingPreviews
                        ? "Generando previews de páginas..."
                        : "Subiendo..."}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {isDragActive
                        ? "Soltá el archivo aquí"
                        : "Arrastrá un archivo o hacé clic"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF o imágenes
                    </p>
                  </div>
                )}
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
                                {asset.page_count
                                  ? ` · ${asset.page_count} págs`
                                  : ""}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] shrink-0"
                            >
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
