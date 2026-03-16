import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useTemplateBlocks, useUpdateTemplateBlock, useDeleteTemplateBlock, useCreateTemplateBlock } from "@/hooks/useTemplateBlocks";
import { useTemplateFields, useUpdateTemplateField, useDeleteTemplateField, useCreateTemplateField } from "@/hooks/useTemplateFields";
import { useTemplateAssets, useTemplateAssetPages } from "@/hooks/useTemplateAssets";
import { getAssetSignedUrl } from "@/lib/assetUrlHelper";
import { parseLegacyHtml } from "@/lib/legacyToBlocks";
import { supabase } from "@/integrations/supabase/client";
import { uploadTemplateImage } from "@/lib/templateImageUpload";
import { FIELD_LABELS } from "@/lib/widgetUtils";
import { useWidgetDrag } from "@/hooks/useWidgetDrag";
import type { TemplateBlock, TemplateField, FieldType, SignerRole, BlockType } from "@/types/templateDesigner";
import type { Json } from "@/integrations/supabase/types";
import { OpenSignPagesSidebar, type PageEntry } from "./OpenSignPagesSidebar";
import { OpenSignCanvas } from "./OpenSignCanvas";
import { OpenSignRightPanel } from "./OpenSignRightPanel";
import { WidgetDragOverlay } from "@/components/designer2/WidgetDragOverlay";
import { AssetUploadModal } from "@/components/designer2/AssetUploadModal";
import type { WidgetDragData } from "@/lib/widgetUtils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ROLE_BORDER: Record<SignerRole, string> = {
  titular: "#2563eb",
  adherente: "#16a34a",
  contratada: "#9333ea",
};

interface OpenSignTemplateEditorProps {
  templateId: string;
  legacyContent?: string;
}

export const OpenSignTemplateEditor: React.FC<OpenSignTemplateEditorProps> = ({
  templateId,
  legacyContent,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* ─── State ─── */
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(80);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [placementActive, setPlacementActive] = useState(false);
  const [activeRole, setActiveRole] = useState<SignerRole>("titular");
  const [activeFieldType, setActiveFieldType] = useState<FieldType>("signature");
  const [resolvedPages, setResolvedPages] = useState<PageEntry[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [activeDragData, setActiveDragData] = useState<WidgetDragData | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [pendingImageBlockId, setPendingImageBlockId] = useState<string | null>(null);

  /* ─── Stable image file input ref (lives at editor root, never unmounts) ─── */
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Progressive mount: defer DnD to avoid freeze ─── */
  const [dndReady, setDndReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setDndReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ─── @dnd-kit sensors ─── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  /* ─── Data ─── */
  const { data: blocks = [], isLoading: blocksLoading } = useTemplateBlocks(templateId);
  const { data: fields = [], isLoading: fieldsLoading } = useTemplateFields(templateId);
  const { data: assets = [] } = useTemplateAssets(templateId);
  const createField = useCreateTemplateField();

  const pdfAsset = assets.find((a) => a.asset_type === "pdf" && a.status === "ready");
  const { data: assetPages = [] } = useTemplateAssetPages(pdfAsset?.id);

  const updateBlock = useUpdateTemplateBlock();
  const deleteBlock = useDeleteTemplateBlock();
  const createBlock = useCreateTemplateBlock();
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();

  /* ─── Stable image picker callbacks ─── */
  const openImageFilePicker = useCallback(() => {
    setPendingImageBlockId(selectedBlockId);
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    imageFileInputRef.current?.click();
  }, [selectedBlockId]);

  /* ─── Insert image block: create block then open picker ─── */
  const handleInsertImageBlock = useCallback(() => {
    createBlock.mutate({
      template_id: templateId, block_type: "image" as BlockType, page: currentPage,
      x: 10, y: 10, w: 30, h: 20, z_index: 10, rotation: 0,
      is_locked: false, is_visible: true,
      content: { src: "", alt: "", storage_path: "" },
      style: {}, visibility_rules: { roles: ["titular", "adherente", "contratada"], conditions: [] },
      sort_order: blocks.length,
    }, {
      onSuccess: (newBlock: any) => {
        const blockId = newBlock?.id || newBlock?.[0]?.id;
        if (blockId) {
          setPendingImageBlockId(blockId);
          setSelectedBlockId(blockId);
        }
        // Open file picker after short delay to ensure state is set
        setTimeout(() => {
          if (imageFileInputRef.current) imageFileInputRef.current.value = "";
          imageFileInputRef.current?.click();
        }, 100);
      },
    });
  }, [createBlock, templateId, currentPage, blocks.length]);

  const handleImageFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetBlockId = pendingImageBlockId;
    if (!targetBlockId) return;
    try {
      const result = await uploadTemplateImage(file, templateId);
      updateBlock.mutate({ id: targetBlockId, content: { ...((blocks.find(b => b.id === targetBlockId)?.content as any) || {}), src: result.signedUrl, storage_path: result.storagePath, alt: file.name } } as any);
      toast({ title: "Imagen subida" });
    } catch (err: any) {
      toast({ title: "Error al subir imagen", description: err.message, variant: "destructive" });
    } finally {
      setPendingImageBlockId(null);
    }
  }, [pendingImageBlockId, templateId, updateBlock, blocks, toast]);

  /* ─── Drag-and-drop hook (consolidated logic) ─── */
  const { handleDragStart: onDragStart, handleDragEnd: onDragEnd } = useWidgetDrag({
    templateId,
    currentPage,
    activeRole,
    pageSelector: "[data-a4-page]",
    zoom,
    onCreateField: (params) => createField.mutate(params as any),
  });

  const handleDragStart = useCallback((event: any) => {
    const data = event.active.data.current as WidgetDragData | undefined;
    if (data?.type === "widget") setActiveDragData(data);
    onDragStart(event);
  }, [onDragStart]);

  const handleDragEnd = useCallback((event: any) => {
    setActiveDragData(null);
    onDragEnd(event);
  }, [onDragEnd]);

  /* ─── Migration detection ─── */
  const dataLoaded = !blocksLoading && !fieldsLoading;
  const hasLegacy = !!legacyContent?.trim();
  const canMigrateBlocks = dataLoaded && hasLegacy && blocks.length === 0;
  const canMigrateFields = dataLoaded && hasLegacy && fields.length === 0;
  const needsMigration = canMigrateBlocks || canMigrateFields;

  const handleMigrate = useCallback(async () => {
    if (!legacyContent?.trim()) return;
    setMigrating(true);
    try {
      await new Promise(r => setTimeout(r, 50));
      const { blocks: parsedBlocks, signatureFields } = parseLegacyHtml(templateId, legacyContent);
      let blocksCreated = 0;
      let fieldsCreated = 0;
      const CHUNK = 50;

      if (canMigrateBlocks && parsedBlocks.length > 0) {
        const rows = parsedBlocks.map((b, i) => ({
          ...b, sort_order: i,
          content: b.content as unknown as Json,
          style: b.style as unknown as Json,
          visibility_rules: b.visibility_rules as unknown as Json,
        }));
        for (let i = 0; i < rows.length; i += CHUNK) {
          const { error: bErr } = await supabase.from("template_blocks").insert(rows.slice(i, i + CHUNK) as any);
          if (bErr) throw bErr;
        }
        blocksCreated = parsedBlocks.length;
      }

      if (canMigrateFields && signatureFields.length > 0) {
        const fieldRows = signatureFields.map((f) => ({ ...f, meta: f.meta as unknown as Json }));
        const { error: fErr } = await supabase.from("template_fields").insert(fieldRows as any);
        if (fErr) throw fErr;
        fieldsCreated = signatureFields.length;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["template-blocks", templateId] }),
        queryClient.invalidateQueries({ queryKey: ["template-fields", templateId] }),
      ]);

      setCurrentPage(1); setSelectedBlockId(null); setSelectedFieldId(null); setPlacementActive(false);
      toast({ title: "Migración completada", description: `${blocksCreated} bloques y ${fieldsCreated} campos creados.` });
    } catch (err: any) {
      console.error("Migration error:", err);
      toast({ title: "Error en migración", description: err.message, variant: "destructive" });
    } finally {
      setMigrating(false);
    }
  }, [legacyContent, templateId, queryClient, toast, canMigrateBlocks, canMigrateFields]);

  /* ─── Selection coordination ─── */
  const handleSelectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
    if (id) setSelectedFieldId(null);
  }, []);

  const handleSelectField = useCallback((id: string | null) => {
    setSelectedFieldId(id);
    if (id) setSelectedBlockId(null);
  }, []);

  /* ─── Resolve signed URLs — LAZY: only current page ─── */
  const rawPages: PageEntry[] = useMemo(() => {
    if (assetPages.length > 0) {
      return assetPages.map((ap) => ({ page: ap.page_number, previewUrl: ap.preview_image_url }));
    }
    const maxPage = blocks.reduce((max, b) => Math.max(max, b.page), 1);
    return Array.from({ length: maxPage }, (_, i) => ({ page: i + 1, previewUrl: null }));
  }, [assetPages, blocks]);

  // Resolve only the current page's signed URL (lazy)
  const [resolvedUrlMap, setResolvedUrlMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const page = rawPages.find((p) => p.page === currentPage);
    if (!page?.previewUrl) return;
    // Already resolved or is a full URL
    if (resolvedUrlMap[currentPage]) return;
    if (page.previewUrl.startsWith("http") || page.previewUrl.startsWith("data:") || page.previewUrl.startsWith("blob:")) {
      setResolvedUrlMap((prev) => ({ ...prev, [currentPage]: page.previewUrl! }));
      return;
    }
    let cancelled = false;
    getAssetSignedUrl(page.previewUrl).then((signed) => {
      if (!cancelled && signed) {
        setResolvedUrlMap((prev) => ({ ...prev, [currentPage]: signed }));
      }
    });
    return () => { cancelled = true; };
  }, [rawPages, currentPage, resolvedUrlMap]);

  const pages: PageEntry[] = useMemo(() => {
    return rawPages.map((p) => ({
      ...p,
      previewUrl: resolvedUrlMap[p.page] || p.previewUrl,
    }));
  }, [rawPages, resolvedUrlMap]);

  const currentPageBackground = useMemo(() => {
    return resolvedUrlMap[currentPage] || undefined;
  }, [resolvedUrlMap, currentPage]);

  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedBlockId) || null, [blocks, selectedBlockId]);
  const selectedField = useMemo(() => fields.find((f) => f.id === selectedFieldId) || null, [fields, selectedFieldId]);

  /* ─── Block handlers ─── */
  const handleUpdateBlock = useCallback((updates: Partial<TemplateBlock>) => {
    if (!selectedBlockId) return;
    updateBlock.mutate({ id: selectedBlockId, ...updates } as any);
  }, [selectedBlockId, updateBlock]);

  const handleDeleteBlock = useCallback((id: string) => {
    deleteBlock.mutate({ id, templateId });
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [deleteBlock, templateId, selectedBlockId]);

  const handleDuplicateBlock = useCallback((id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    createBlock.mutate({
      template_id: templateId, block_type: block.block_type, page: block.page,
      x: block.x + 2, y: block.y + 2, w: block.w, h: block.h,
      z_index: block.z_index, rotation: block.rotation,
      is_locked: false, is_visible: true,
      content: block.content, style: block.style,
      visibility_rules: block.visibility_rules, sort_order: block.sort_order + 1,
    });
  }, [blocks, createBlock, templateId]);

  const handleToggleLock = useCallback((id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block) updateBlock.mutate({ id, is_locked: !block.is_locked } as any);
  }, [blocks, updateBlock]);

  const handleToggleVisibility = useCallback((id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block) updateBlock.mutate({ id, is_visible: !block.is_visible } as any);
  }, [blocks, updateBlock]);

  const handleUpdatePosition = useCallback((id: string, x: number, y: number, w: number, h: number) => {
    updateBlock.mutate({ id, x, y, w, h } as any);
  }, [updateBlock]);

  const handleAddBlock = useCallback((type: BlockType) => {
    if (type === "signature_block") return;
    const defaults: Record<string, any> = {
      text: { content: { kind: "rich_text", html: "<p>Nuevo texto</p>", plain_text: "Nuevo texto", semantic_role: "paragraph", placeholder_refs: [] }, style: { fontSize: 12, fontWeight: 400, textAlign: "left" } },
      heading: { content: { kind: "heading", level: 2, text: "Título", placeholder_refs: [] }, style: { fontSize: 18, fontWeight: 700, textAlign: "center" } },
    };
    const d = defaults[type] || { content: {}, style: {} };
    createBlock.mutate({
      template_id: templateId, block_type: type, page: currentPage,
      x: 0, y: 0, w: 100, h: 10, z_index: 0, rotation: 0,
      is_locked: false, is_visible: true,
      content: d.content, style: d.style,
      visibility_rules: { roles: ["titular", "adherente", "contratada"], conditions: [] },
      sort_order: blocks.length,
    });
  }, [createBlock, templateId, currentPage, blocks.length]);

  /* ─── Field handlers ─── */
  const handleUpdateField = useCallback((updates: Partial<TemplateField>) => {
    if (!selectedFieldId) return;
    updateField.mutate({ id: selectedFieldId, ...updates } as any);
  }, [selectedFieldId, updateField]);

  const handleDeleteField = useCallback((id: string) => {
    deleteField.mutate({ id, templateId });
    if (selectedFieldId === id) setSelectedFieldId(null);
  }, [deleteField, templateId, selectedFieldId]);

  /* ─── Editor content ─── */
  const editorContent = (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Stable hidden file input — never unmounts */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleImageFileSelected}
      />
      {/* Migration banner */}
      {needsMigration && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            Este template tiene contenido Legacy y todavía no fue migrado a V2.
          </p>
          <Button type="button" size="sm" onClick={handleMigrate} disabled={migrating}>
            {migrating ? <><Loader2 className="h-4 w-4 animate-spin" /> Migrando…</> : "Migrar a V2"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[180px_1fr_280px] flex-1 overflow-hidden">
        <OpenSignPagesSidebar
          pages={pages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          fields={fields}
        />
        <OpenSignCanvas
          templateId={templateId}
          blocks={blocks}
          currentPage={currentPage}
          zoom={zoom}
          onZoomChange={setZoom}
          totalPages={pages.length}
          selectedBlockId={selectedBlockId}
          onSelectBlock={handleSelectBlock}
          onDeleteBlock={handleDeleteBlock}
          onDuplicateBlock={handleDuplicateBlock}
          onToggleLock={handleToggleLock}
          onToggleVisibility={handleToggleVisibility}
          onUpdatePosition={handleUpdatePosition}
          placementActive={placementActive}
          activeFieldType={activeFieldType}
          activeSignerRole={activeRole}
          pageBackgroundUrl={currentPageBackground}
          selectedFieldId={selectedFieldId}
          onFieldSelect={handleSelectField}
          onPageChange={setCurrentPage}
        />
        <OpenSignRightPanel
          templateId={templateId}
          selectedBlock={selectedBlock}
          onUpdateBlock={handleUpdateBlock}
          onAddBlock={handleAddBlock}
          fields={fields}
          activeRole={activeRole}
          onRoleChange={setActiveRole}
          activeFieldType={activeFieldType}
          onFieldTypeChange={setActiveFieldType}
          placementActive={placementActive}
          onTogglePlacement={setPlacementActive}
          selectedField={selectedField}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
          onInsertDocument={() => setShowAssetModal(true)}
          onInsertImage={handleInsertImageBlock}
          onRequestPickImage={openImageFilePicker}
        />
      </div>

      {/* Asset upload modal */}
      <AssetUploadModal
        templateId={templateId}
        open={showAssetModal}
        onOpenChange={setShowAssetModal}
        onAssetInserted={() => {
          queryClient.invalidateQueries({ queryKey: ["template-assets", templateId] });
        }}
      />
    </div>
  );

  /* ─── Render: progressive mount wraps DnD only when ready ─── */
  if (!dndReady) {
    return editorContent;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {editorContent}
      <WidgetDragOverlay activeData={activeDragData} />
    </DndContext>
  );
};

export default OpenSignTemplateEditor;
