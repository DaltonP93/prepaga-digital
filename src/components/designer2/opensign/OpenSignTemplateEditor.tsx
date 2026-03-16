import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTemplateBlocks, useUpdateTemplateBlock, useDeleteTemplateBlock, useCreateTemplateBlock } from "@/hooks/useTemplateBlocks";
import { useTemplateFields, useUpdateTemplateField, useDeleteTemplateField } from "@/hooks/useTemplateFields";
import { useTemplateAssets, useTemplateAssetPages } from "@/hooks/useTemplateAssets";
import { getAssetSignedUrl } from "@/lib/assetUrlHelper";
import { parseLegacyHtml } from "@/lib/legacyToBlocks";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateBlock, TemplateField, FieldType, SignerRole, BlockType } from "@/types/templateDesigner";
import type { Json } from "@/integrations/supabase/types";
import { OpenSignPagesSidebar, type PageEntry } from "./OpenSignPagesSidebar";
import { OpenSignCanvas } from "./OpenSignCanvas";
import { OpenSignRightPanel } from "./OpenSignRightPanel";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  /* ─── Data ─── */
  const { data: blocks = [], isLoading: blocksLoading } = useTemplateBlocks(templateId);
  const { data: fields = [], isLoading: fieldsLoading } = useTemplateFields(templateId);
  const { data: assets = [] } = useTemplateAssets(templateId);

  const pdfAsset = assets.find((a) => a.asset_type === "pdf" && a.status === "ready");
  const { data: assetPages = [] } = useTemplateAssetPages(pdfAsset?.id);

  const updateBlock = useUpdateTemplateBlock();
  const deleteBlock = useDeleteTemplateBlock();
  const createBlock = useCreateTemplateBlock();
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();

  /* ─── Migration detection (partial-aware) ─── */
  const dataLoaded = !blocksLoading && !fieldsLoading;
  const hasLegacy = !!legacyContent?.trim();
  const canMigrateBlocks = dataLoaded && hasLegacy && blocks.length === 0;
  const canMigrateFields = dataLoaded && hasLegacy && fields.length === 0;
  const needsMigration = canMigrateBlocks || canMigrateFields;

  const handleMigrate = useCallback(async () => {
    if (!legacyContent?.trim()) return;
    setMigrating(true);
    try {
      // Yield to browser so React can paint the spinner before heavy sync work
      await new Promise(r => setTimeout(r, 50));

      const { blocks: parsedBlocks, signatureFields } = parseLegacyHtml(templateId, legacyContent);
      let blocksCreated = 0;
      let fieldsCreated = 0;

      const CHUNK = 50;

      // Insert blocks only if none exist yet (chunked)
      if (canMigrateBlocks && parsedBlocks.length > 0) {
        const rows = parsedBlocks.map((b, i) => ({
          ...b,
          sort_order: i,
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

      // Insert signature fields only if none exist yet
      if (canMigrateFields && signatureFields.length > 0) {
        const fieldRows = signatureFields.map((f) => ({
          ...f,
          meta: f.meta as unknown as Json,
        }));
        const { error: fErr } = await supabase.from("template_fields").insert(fieldRows as any);
        if (fErr) throw fErr;
        fieldsCreated = signatureFields.length;
      }

      // Refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["template-blocks", templateId] }),
        queryClient.invalidateQueries({ queryKey: ["template-fields", templateId] }),
      ]);

      // Post-migration UX: reset view state
      setCurrentPage(1);
      setSelectedBlockId(null);
      setSelectedFieldId(null);
      setPlacementActive(false);

      toast({ title: "Migración completada", description: `${blocksCreated} bloques y ${fieldsCreated} campos creados.` });
    } catch (err: any) {
      console.error("Migration error:", err);
      toast({ title: "Error en migración", description: err.message, variant: "destructive" });
    } finally {
      setMigrating(false);
    }
  }, [legacyContent, templateId, queryClient, toast, canMigrateBlocks, canMigrateFields]);

  /* ─── Selection coordination: field ↔ block ─── */
  const handleSelectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
    if (id) setSelectedFieldId(null);
  }, []);

  const handleSelectField = useCallback((id: string | null) => {
    setSelectedFieldId(id);
    if (id) setSelectedBlockId(null);
  }, []);

  /* ─── Resolve signed URLs for page thumbnails ─── */
  const rawPages: PageEntry[] = useMemo(() => {
    if (assetPages.length > 0) {
      return assetPages.map((ap) => ({
        page: ap.page_number,
        previewUrl: ap.preview_image_url,
      }));
    }
    const maxPage = blocks.reduce((max, b) => Math.max(max, b.page), 1);
    return Array.from({ length: maxPage }, (_, i) => ({
      page: i + 1,
      previewUrl: null,
    }));
  }, [assetPages, blocks]);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const results: PageEntry[] = await Promise.all(
        rawPages.map(async (p) => {
          if (!p.previewUrl) return p;
          if (p.previewUrl.startsWith("http") || p.previewUrl.startsWith("data:") || p.previewUrl.startsWith("blob:")) return p;
          const signed = await getAssetSignedUrl(p.previewUrl);
          return { ...p, previewUrl: signed || null };
        })
      );
      if (!cancelled) setResolvedPages(results);
    };
    resolve();
    return () => { cancelled = true; };
  }, [rawPages]);

  /* ─── Current page background ─── */
  const currentPageBackground = useMemo(() => {
    const entry = resolvedPages.find((p) => p.page === currentPage);
    return entry?.previewUrl || undefined;
  }, [resolvedPages, currentPage]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  /* ─── Block handlers ─── */
  const handleUpdateBlock = useCallback(
    (updates: Partial<TemplateBlock>) => {
      if (!selectedBlockId) return;
      updateBlock.mutate({ id: selectedBlockId, ...updates } as any);
    },
    [selectedBlockId, updateBlock]
  );

  const handleDeleteBlock = useCallback(
    (id: string) => {
      deleteBlock.mutate({ id, templateId });
      if (selectedBlockId === id) setSelectedBlockId(null);
    },
    [deleteBlock, templateId, selectedBlockId]
  );

  const handleDuplicateBlock = useCallback(
    (id: string) => {
      const block = blocks.find((b) => b.id === id);
      if (!block) return;
      createBlock.mutate({
        template_id: templateId,
        block_type: block.block_type,
        page: block.page,
        x: block.x + 2, y: block.y + 2,
        w: block.w, h: block.h,
        z_index: block.z_index, rotation: block.rotation,
        is_locked: false, is_visible: true,
        content: block.content, style: block.style,
        visibility_rules: block.visibility_rules,
        sort_order: block.sort_order + 1,
      });
    },
    [blocks, createBlock, templateId]
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      const block = blocks.find((b) => b.id === id);
      if (block) updateBlock.mutate({ id, is_locked: !block.is_locked } as any);
    },
    [blocks, updateBlock]
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const block = blocks.find((b) => b.id === id);
      if (block) updateBlock.mutate({ id, is_visible: !block.is_visible } as any);
    },
    [blocks, updateBlock]
  );

  const handleUpdatePosition = useCallback(
    (id: string, x: number, y: number, w: number, h: number) => {
      updateBlock.mutate({ id, x, y, w, h } as any);
    },
    [updateBlock]
  );

  const handleAddBlock = useCallback(
    (type: BlockType) => {
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
    },
    [createBlock, templateId, currentPage, blocks.length]
  );

  /* ─── Field handlers for right panel ─── */
  const handleUpdateField = useCallback(
    (updates: Partial<TemplateField>) => {
      if (!selectedFieldId) return;
      updateField.mutate({ id: selectedFieldId, ...updates } as any);
    },
    [selectedFieldId, updateField]
  );

  const handleDeleteField = useCallback(
    (id: string) => {
      deleteField.mutate({ id, templateId });
      if (selectedFieldId === id) setSelectedFieldId(null);
    },
    [deleteField, templateId, selectedFieldId]
  );

  const pages = resolvedPages.length > 0 ? resolvedPages : rawPages;

  /* ─── Render ─── */
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Migration banner */}
      {needsMigration && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            Este template tiene contenido Legacy y todavía no fue migrado a V2.
          </p>
          <Button
            size="sm"
            onClick={handleMigrate}
            disabled={migrating}
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Migrando…
              </>
            ) : (
              "Migrar a V2"
            )}
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
        />
      </div>
    </div>
  );
};

export default OpenSignTemplateEditor;
