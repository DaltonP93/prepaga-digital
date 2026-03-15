import React, { useState, useMemo, useCallback } from "react";
import { useTemplateBlocks, useUpdateTemplateBlock, useDeleteTemplateBlock, useCreateTemplateBlock } from "@/hooks/useTemplateBlocks";
import { useTemplateFields } from "@/hooks/useTemplateFields";
import { useTemplateAssets, useTemplateAssetPages } from "@/hooks/useTemplateAssets";
import type { TemplateBlock, FieldType, SignerRole, BlockType } from "@/types/templateDesigner";
import { OpenSignPagesSidebar, type PageEntry } from "./OpenSignPagesSidebar";
import { OpenSignCanvas } from "./OpenSignCanvas";
import { OpenSignRightPanel } from "./OpenSignRightPanel";

interface OpenSignTemplateEditorProps {
  templateId: string;
}

export const OpenSignTemplateEditor: React.FC<OpenSignTemplateEditorProps> = ({
  templateId,
}) => {
  /* ─── State ─── */
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(80);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [placementActive, setPlacementActive] = useState(false);
  const [activeRole, setActiveRole] = useState<SignerRole>("titular");
  const [activeFieldType, setActiveFieldType] = useState<FieldType>("signature");

  /* ─── Data ─── */
  const { data: blocks = [] } = useTemplateBlocks(templateId);
  const { data: fields = [] } = useTemplateFields(templateId);
  const { data: assets = [] } = useTemplateAssets(templateId);

  // Find first PDF asset for page thumbnails
  const pdfAsset = assets.find((a) => a.asset_type === "pdf" && a.status === "ready");
  const { data: assetPages = [] } = useTemplateAssetPages(pdfAsset?.id);

  const updateBlock = useUpdateTemplateBlock();
  const deleteBlock = useDeleteTemplateBlock();
  const createBlock = useCreateTemplateBlock();

  /* ─── Computed pages ─── */
  const pages: PageEntry[] = useMemo(() => {
    // If we have PDF asset pages, use those
    if (assetPages.length > 0) {
      return assetPages.map((ap) => ({
        page: ap.page_number,
        previewUrl: ap.preview_image_url,
      }));
    }
    // Otherwise, derive from blocks
    const maxPage = blocks.reduce((max, b) => Math.max(max, b.page), 1);
    return Array.from({ length: maxPage }, (_, i) => ({
      page: i + 1,
      previewUrl: null,
    }));
  }, [assetPages, blocks]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
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
        x: block.x + 2,
        y: block.y + 2,
        w: block.w,
        h: block.h,
        z_index: block.z_index,
        rotation: block.rotation,
        is_locked: false,
        is_visible: true,
        content: block.content,
        style: block.style,
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
      const defaults: Record<string, any> = {
        text: { content: { kind: "rich_text", html: "<p>Nuevo texto</p>", plain_text: "Nuevo texto", semantic_role: "paragraph", placeholder_refs: [] }, style: { fontSize: 12, fontWeight: 400, textAlign: "left" } },
        heading: { content: { kind: "heading", level: 2, text: "Título", placeholder_refs: [] }, style: { fontSize: 18, fontWeight: 700, textAlign: "center" } },
        signature_block: { content: { kind: "signature_block", signer_role: activeRole, signature_mode: "electronic", show_name: true, show_dni: true, show_timestamp: true, show_ip: false, show_method: false, label: "Firma", preset: "legal_v2" }, style: { align: "center", size: "normal", borderTop: true } },
      };
      const d = defaults[type] || { content: {}, style: {} };
      createBlock.mutate({
        template_id: templateId,
        block_type: type,
        page: currentPage,
        x: 0,
        y: 0,
        w: 100,
        h: 10,
        z_index: 0,
        rotation: 0,
        is_locked: false,
        is_visible: true,
        content: d.content,
        style: d.style,
        visibility_rules: { roles: ["titular", "adherente", "contratada"], conditions: [] },
        sort_order: blocks.length,
      });
    },
    [createBlock, templateId, currentPage, blocks.length, activeRole]
  );

  /* ─── Render ─── */
  return (
    <div className="grid grid-cols-[180px_1fr_280px] h-[calc(100vh-4rem)] overflow-hidden">
      <OpenSignPagesSidebar
        pages={pages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      <OpenSignCanvas
        templateId={templateId}
        blocks={blocks}
        currentPage={currentPage}
        zoom={zoom}
        onZoomChange={setZoom}
        totalPages={pages.length}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onDeleteBlock={handleDeleteBlock}
        onDuplicateBlock={handleDuplicateBlock}
        onToggleLock={handleToggleLock}
        onToggleVisibility={handleToggleVisibility}
        onUpdatePosition={handleUpdatePosition}
        placementActive={placementActive}
        activeFieldType={activeFieldType}
        activeSignerRole={activeRole}
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
      />
    </div>
  );
};
