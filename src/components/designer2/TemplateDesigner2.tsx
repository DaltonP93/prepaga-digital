import React, { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BlockPalette } from "./BlockPalette";
import { CanvasBlock, POSITIONED_TYPES } from "./CanvasBlock";
import { BlockPropertyPanel } from "./BlockPropertyPanel";
import { AssetUploadModal } from "./AssetUploadModal";
import { FieldOverlay } from "./FieldOverlay";
import { CanvasFieldOverlay } from "./CanvasFieldOverlay";
import { VersionPanel } from "./VersionPanel";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import {
  useTemplateBlocks,
  useCreateTemplateBlock,
  useUpdateTemplateBlock,
  useDeleteTemplateBlock,
  useReorderTemplateBlocks,
} from "@/hooks/useTemplateBlocks";
import { parseLegacyHtmlToBlocks } from "@/lib/legacyToBlocks";
import {
  ZoomIn, ZoomOut, Maximize, AlertTriangle,
  Layers, Settings2, GitBranch, FileText, Crosshair, X, MousePointer,
} from "lucide-react";
import type {
  BlockType, TemplateBlock, TemplateBlockInsert,
  BlockContent, SignerRole, FieldType,
} from "@/types/templateDesigner";

interface TemplateDesigner2Props {
  templateId: string;
  legacyContent?: string;
}

/* ───── Default content factories ───── */

const defaultContent = (type: BlockType): BlockContent => {
  switch (type) {
    case "text":
      return { kind: "rich_text", html: "<p>Texto del párrafo...</p>", plain_text: "Texto del párrafo...", semantic_role: "paragraph", placeholder_refs: [] };
    case "heading":
      return { kind: "heading", level: 1, text: "Título de Sección", placeholder_refs: [] };
    case "image":
      return { kind: "image", asset_id: "", src: "", alt: "", caption: "", fit: "contain", is_background: false };
    case "attachment_card":
      return { kind: "attachment_card", asset_id: "", title: "Documento adjunto", description: "", display_mode: "card", show_file_icon: true, show_meta: true, include_in_final_pdf: true, requires_acknowledgement: false, file_ref: { mime_type: "", page_count: 0 } };
    case "pdf_embed":
      return { kind: "pdf_embed", asset_id: "", source_type: "pdf", display_mode: "embedded_pages", page_selection: { mode: "all", pages: [] }, render_mode: "preview_image", final_output_mode: "merge_original_pdf_pages", page_previews: [], allow_overlay_fields: true, replaceable: true };
    case "docx_embed":
      return { kind: "docx_embed", asset_id: "", source_type: "docx", converted_pdf_asset_id: "", display_mode: "embedded_pages", page_selection: { mode: "all" }, render_mode: "preview_image", final_output_mode: "merge_converted_pdf_pages", allow_overlay_fields: true };
    case "signature_block":
      return { kind: "signature_block", signer_role: "titular", signature_mode: "electronic", show_name: true, show_dni: true, show_timestamp: true, show_ip: false, show_method: true, label: "Firma del Titular", preset: "legal_v2" };
    case "table":
      return { kind: "table", source: "beneficiaries", columns: [{ key: "full_name", label: "Nombre" }, { key: "dni", label: "CI" }, { key: "relationship", label: "Parentesco" }], header: true, striped: false, empty_state: "Sin beneficiarios" };
    case "page_break":
      return { kind: "page_break" };
    case "placeholder_chip":
      return { kind: "placeholder_chip", placeholder_key: "client.full_name", label: "Nombre completo", example_value: "Juan Pérez" };
    default:
      return { kind: "page_break" } as any;
  }
};

const defaultStyle = (type: BlockType): Record<string, unknown> => {
  switch (type) {
    case "text":
      return { fontFamily: "Inter", fontSize: 12, fontWeight: 400, lineHeight: 1.5, textAlign: "left", color: "#111827", padding: 0, marginTop: 0, marginBottom: 8 };
    case "heading":
      return { fontFamily: "Inter", fontSize: 20, fontWeight: 700, textAlign: "center", color: "#111827", marginBottom: 16 };
    case "signature_block":
      return { align: "left", size: "normal", borderTop: true, paddingTop: 12, fontSize: 11 };
    case "table":
      return { fontSize: 11, headerBackground: "#f3f4f6", borderColor: "#d1d5db", cellPadding: 8 };
    default:
      return {};
  }
};

const ZOOM_LEVELS = [0.75, 1, 1.25] as const;

export const TemplateDesigner2: React.FC<TemplateDesigner2Props> = ({ templateId, legacyContent }) => {
  const { data: blocks = [], isLoading } = useTemplateBlocks(templateId);
  const createBlock = useCreateTemplateBlock();
  const updateBlock = useUpdateTemplateBlock();
  const deleteBlock = useDeleteTemplateBlock();
  const reorder = useReorderTemplateBlocks();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [fieldPlacementRole, setFieldPlacementRole] = useState<SignerRole>("titular");
  const [fieldPlacementType, setFieldPlacementType] = useState<FieldType>("signature");
  const [zoom, setZoom] = useState(1);
  const [migrating, setMigrating] = useState(false);
  const [rightTab, setRightTab] = useState("properties");
  const [insertMode, setInsertMode] = useState<BlockType | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [fieldPlacementActive, setFieldPlacementActive] = useState(false);

  const canvasPageRef = useRef<HTMLDivElement>(null);
  const [pendingImageBlockId, setPendingImageBlockId] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const { toast: toast2 } = useToast();

  const openImageFilePicker = useCallback(() => {
    setPendingImageBlockId(selectedBlockId);
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    imageFileInputRef.current?.click();
  }, [selectedBlockId]);

  const handleImageFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImageBlockId) return;
    try {
      const path = `template-assets/${templateId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      updateBlock.mutate({ id: pendingImageBlockId, content: { ...((blocks.find(b => b.id === pendingImageBlockId)?.content as any) || {}), src: urlData.publicUrl, alt: file.name } } as any);
      toast2({ title: "Imagen subida" });
    } catch (err: any) {
      toast2({ title: "Error al subir imagen", description: err.message, variant: "destructive" });
    } finally {
      setPendingImageBlockId(null);
    }
  }, [pendingImageBlockId, templateId, updateBlock, blocks, toast2]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;
  const hasLegacyContent = !!legacyContent?.trim();
  const hasNoBlocks = blocks.length === 0 && !isLoading;
  const showMigrationBanner = hasLegacyContent && hasNoBlocks;

  /* ───── Split blocks into flow + positioned ───── */
  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order);
  const flowBlocks = sortedBlocks.filter((b) => !POSITIONED_TYPES.has(b.block_type));
  const positionedBlocks = sortedBlocks.filter((b) => POSITIONED_TYPES.has(b.block_type));

  /* ───── Legacy migration ───── */

  const handleMigrateLegacy = useCallback(async () => {
    if (!legacyContent || migrating) return;
    setMigrating(true);
    try {
      const parsed = parseLegacyHtmlToBlocks(templateId, legacyContent);
      for (let i = 0; i < parsed.length; i++) {
        await new Promise<void>((resolve) => {
          createBlock.mutate(
            { ...parsed[i], sort_order: i } as TemplateBlockInsert,
            { onSuccess: () => resolve(), onError: () => resolve() }
          );
        });
      }
    } finally {
      setMigrating(false);
    }
  }, [legacyContent, templateId, createBlock, migrating]);

  /* ───── Block handlers ───── */

  const handleAddFlowBlock = useCallback(
    (type: BlockType) => {
      const maxSort = blocks.reduce((max, b) => Math.max(max, b.sort_order), -1);
      const insert: TemplateBlockInsert = {
        template_id: templateId,
        block_type: type,
        page: 1,
        x: 0, y: 0, w: 100, h: 0,
        z_index: 0, rotation: 0,
        is_locked: false, is_visible: true,
        content: defaultContent(type) as any,
        style: defaultStyle(type),
        visibility_rules: { roles: ["titular", "adherente", "contratada"], conditions: [] },
        sort_order: maxSort + 1,
      };
      createBlock.mutate(insert, {
        onSuccess: (created) => setSelectedBlockId(created.id),
      });
    },
    [blocks, templateId, createBlock]
  );

  const handleStartInsertMode = useCallback((type: BlockType) => {
    setInsertMode((prev) => (prev === type ? null : type));
    setGhostPos(null);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!insertMode || !canvasPageRef.current) return;
      const rect = canvasPageRef.current.getBoundingClientRect();
      const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

      const maxSort = blocks.reduce((max, b) => Math.max(max, b.sort_order), -1);

      // Default sizes depending on type
      let w = 25, h = 8;
      if (insertMode === "image") { w = 30; h = 15; }
      if (insertMode === "pdf_embed") { w = 40; h = 30; }
      if (insertMode === "signature_block") { w = 30; h = 10; }

      // Clamp to page
      const cx = Math.min(xPct, 100 - w);
      const cy = Math.min(yPct, 100 - h);

      const insert: TemplateBlockInsert = {
        template_id: templateId,
        block_type: insertMode,
        page: 1,
        x: cx, y: cy, w, h,
        z_index: 10, rotation: 0,
        is_locked: false, is_visible: true,
        content: defaultContent(insertMode) as any,
        style: defaultStyle(insertMode),
        visibility_rules: { roles: ["titular", "adherente", "contratada"], conditions: [] },
        sort_order: maxSort + 1,
      };

      createBlock.mutate(insert, {
        onSuccess: (created) => setSelectedBlockId(created.id),
      });

      setInsertMode(null);
      setGhostPos(null);
    },
    [insertMode, blocks, templateId, createBlock]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!insertMode || !canvasPageRef.current) return;
      const rect = canvasPageRef.current.getBoundingClientRect();
      setGhostPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [insertMode]
  );

  const handleAssetInserted = useCallback((blockId: string) => setSelectedBlockId(blockId), []);

  const handleUpdateBlock = useCallback(
    (updates: Partial<TemplateBlock>) => {
      if (!selectedBlockId) return;
      updateBlock.mutate({ id: selectedBlockId, ...updates } as any);
    },
    [selectedBlockId, updateBlock]
  );

  const handleUpdatePosition = useCallback(
    (blockId: string, x: number, y: number, w: number, h: number) => {
      updateBlock.mutate({ id: blockId, x, y, w, h } as any);
    },
    [updateBlock]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      deleteBlock.mutate({ id: blockId, templateId });
      if (selectedBlockId === blockId) setSelectedBlockId(null);
    },
    [deleteBlock, templateId, selectedBlockId]
  );

  const handleDuplicateBlock = useCallback(
    (block: TemplateBlock) => {
      const maxSort = blocks.reduce((max, b) => Math.max(max, b.sort_order), -1);
      const offsetX = POSITIONED_TYPES.has(block.block_type) ? Math.min(block.x + 3, 100 - block.w) : block.x;
      const offsetY = POSITIONED_TYPES.has(block.block_type) ? Math.min(block.y + 3, 100 - block.h) : block.y;
      createBlock.mutate({
        template_id: templateId,
        block_type: block.block_type, page: block.page,
        x: offsetX, y: offsetY, w: block.w, h: block.h,
        z_index: block.z_index, rotation: block.rotation,
        is_locked: false, is_visible: block.is_visible,
        content: block.content as any, style: block.style,
        visibility_rules: block.visibility_rules as any,
        sort_order: maxSort + 1,
      }, { onSuccess: (b) => setSelectedBlockId(b.id) });
    },
    [blocks, templateId, createBlock]
  );

  const handleToggleLock = useCallback(
    (block: TemplateBlock) => updateBlock.mutate({ id: block.id, is_locked: !block.is_locked } as any),
    [updateBlock]
  );

  const handleToggleVisibility = useCallback(
    (block: TemplateBlock) => updateBlock.mutate({ id: block.id, is_visible: !block.is_visible } as any),
    [updateBlock]
  );

  /* ───── Flow DnD ───── */

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const from = result.source.index;
      const to = result.destination.index;
      if (from === to) return;
      const reordered = [...flowBlocks];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      reorder.mutate({ templateId, blocks: reordered.map((b, i) => ({ id: b.id, sort_order: i })) });
    },
    [flowBlocks, reorder, templateId]
  );

  const pageNumbers = [...new Set(sortedBlocks.map((b) => b.page || 1))].sort((a, b) => a - b);
  if (pageNumbers.length === 0) pageNumbers.push(1);

  /* ───── Ghost preview for insert mode ───── */
  const ghostSize = insertMode === "image" ? { w: 30, h: 15 }
    : insertMode === "pdf_embed" ? { w: 40, h: 30 }
    : insertMode === "signature_block" ? { w: 30, h: 10 }
    : { w: 25, h: 8 };

  return (
    <div className="grid grid-cols-[180px_1fr_260px] gap-3 min-h-[600px]">
      {/* ─── Left: Compact Block Palette ─── */}
      <div className="rounded-lg border bg-card">
        <BlockPalette
          onAddBlock={handleAddFlowBlock}
          onInsertAsset={() => setShowAssetModal(true)}
          onStartInsertMode={handleStartInsertMode}
          activeInsertMode={insertMode}
        />
      </div>

      {/* ─── Center: Canvas ─── */}
      <div className="flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg border bg-card mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">Designer 2.0</Badge>
            <span className="text-[10px] text-muted-foreground">{blocks.length} bloques</span>
            {showMigrationBanner && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                Legacy no migrado
              </Badge>
            )}
            {insertMode && (
              <Badge className="text-[10px] gap-1 bg-primary text-primary-foreground animate-pulse">
                <Crosshair className="h-3 w-3" />
                Insertando: {insertMode}
                <button onClick={() => { setInsertMode(null); setGhostPos(null); }} className="ml-1 hover:opacity-70">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Pág {pageNumbers.length}</span>
            <div className="flex items-center border rounded-md">
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom((z) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z as any) - 1)] || 0.75)}>
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-[10px] w-8 text-center">{Math.round(zoom * 100)}%</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom((z) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z as any) + 1)] || 1.25)}>
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(1)}>
                <Maximize className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {fieldPlacementActive && (
            <Badge variant="outline" className="text-[10px] gap-1 animate-pulse">
              <MousePointer className="h-3 w-3" />
              Colocando campos
            </Badge>
          )}
        </div>

        {/* Migration banner */}
        {showMigrationBanner && (
          <Alert className="mb-2 border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-[11px]">
                Este template tiene contenido Legacy. El canvas V2 está vacío hasta migrarlo.
              </span>
              <Button
                type="button"
                size="sm"
                className="h-7 text-[11px] ml-3 shrink-0"
                onClick={handleMigrateLegacy}
                disabled={migrating}
              >
                {migrating ? "Migrando..." : "Migrar a V2"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Canvas */}
        <ScrollArea className="flex-1 rounded-lg border bg-muted/20 p-4" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          <div
            className="mx-auto transition-transform origin-top"
            style={{ maxWidth: "794px", transform: `scale(${zoom})` }}
          >
            {/* A4 Page */}
            <div
              ref={canvasPageRef}
              className={`bg-card shadow-lg rounded-sm border relative ${insertMode ? "cursor-crosshair" : ""}`}
              style={{ width: "100%", minHeight: "1122px", padding: "40px" }}
              onClick={insertMode ? handleCanvasClick : undefined}
              onMouseMove={insertMode ? handleCanvasMouseMove : undefined}
              onMouseLeave={() => setGhostPos(null)}
            >
              {/* Flow blocks — vertical DnD list */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="canvas-blocks">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 relative z-0"
                    >
                      {flowBlocks.map((block, index) => (
                        <Draggable key={block.id} draggableId={block.id} index={index} isDragDisabled={block.is_locked}>
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              style={{ ...dragProvided.draggableProps.style, opacity: snapshot.isDragging ? 0.8 : 1 }}
                            >
                              <CanvasBlock
                                block={block}
                                isSelected={selectedBlockId === block.id}
                                onSelect={() => setSelectedBlockId(block.id)}
                                onDelete={() => handleDeleteBlock(block.id)}
                                onDuplicate={() => handleDuplicateBlock(block)}
                                onToggleLock={() => handleToggleLock(block)}
                                onToggleVisibility={() => handleToggleVisibility(block)}
                                dragHandleProps={dragProvided.dragHandleProps}
                                templateId={templateId}
                                fieldPlacementRole={fieldPlacementRole}
                                fieldPlacementType={fieldPlacementType}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Positioned blocks — absolute on the page */}
              {positionedBlocks.map((block) => (
                <div
                  key={block.id}
                  className="absolute"
                  style={{
                    left: `${block.x}%`,
                    top: `${block.y}%`,
                    width: `${block.w}%`,
                    height: block.h > 0 ? `${block.h}%` : "auto",
                    zIndex: block.z_index + 10,
                  }}
                >
                  <CanvasBlock
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => setSelectedBlockId(block.id)}
                    onDelete={() => handleDeleteBlock(block.id)}
                    onDuplicate={() => handleDuplicateBlock(block)}
                    onToggleLock={() => handleToggleLock(block)}
                    onToggleVisibility={() => handleToggleVisibility(block)}
                    onUpdatePosition={(x, y, w, h) => handleUpdatePosition(block.id, x, y, w, h)}
                    templateId={templateId}
                    fieldPlacementRole={fieldPlacementRole}
                    fieldPlacementType={fieldPlacementType}
                  />
                </div>
              ))}

              {/* Page-level field overlays */}
              <CanvasFieldOverlay
                templateId={templateId}
                activeFieldType={fieldPlacementType}
                activeSignerRole={fieldPlacementRole}
                placementActive={fieldPlacementActive && !insertMode}
                currentPage={1}
              />

              {/* Ghost preview during insert mode */}
              {insertMode && ghostPos && (
                <div
                  className="absolute pointer-events-none border-2 border-dashed border-primary/50 bg-primary/10 rounded-md z-50 transition-none"
                  style={{
                    left: `${Math.min(ghostPos.x, 100 - ghostSize.w)}%`,
                    top: `${Math.min(ghostPos.y, 100 - ghostSize.h)}%`,
                    width: `${ghostSize.w}%`,
                    height: `${ghostSize.h}%`,
                  }}
                >
                  <span className="absolute top-1 left-1 text-[8px] text-primary font-medium">{insertMode}</span>
                </div>
              )}

              {/* Empty state */}
              {hasNoBlocks && !showMigrationBanner && (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">Canvas vacío</p>
                  <p className="text-[11px]">Agregá bloques desde el panel izquierdo</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ─── Right: Tabbed Panel ─── */}
      <div className="rounded-lg border bg-card flex flex-col min-h-0">
        <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="w-full rounded-none border-b bg-transparent h-9 p-0 justify-start gap-0">
            <TabsTrigger value="properties" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-9 px-3 text-[11px] gap-1">
              <Settings2 className="h-3 w-3" />
              Props
            </TabsTrigger>
            <TabsTrigger value="fields" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-9 px-3 text-[11px] gap-1">
              <Layers className="h-3 w-3" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="versions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none h-9 px-3 text-[11px] gap-1">
              <GitBranch className="h-3 w-3" />
              Versiones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="flex-1 min-h-0 m-0">
            <BlockPropertyPanel
              block={selectedBlock}
              onUpdate={handleUpdateBlock}
              onAddBlock={handleAddFlowBlock}
              templateId={templateId}
            />
          </TabsContent>

          <TabsContent value="fields" className="flex-1 min-h-0 m-0 p-0">
            <div className="p-2">
              <FieldOverlay
                templateId={templateId}
                selectedBlockId={selectedBlockId || undefined}
                onTogglePlacement={setFieldPlacementActive}
                placementActive={fieldPlacementActive}
                activeFieldType={fieldPlacementType}
                activeSignerRole={fieldPlacementRole}
                onFieldTypeChange={(t) => setFieldPlacementType(t)}
                onSignerRoleChange={(r) => setFieldPlacementRole(r)}
              />
            </div>
          </TabsContent>

          <TabsContent value="versions" className="flex-1 min-h-0 m-0 p-0">
            <div className="p-2">
              <VersionPanel templateId={templateId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Asset upload modal */}
      <AssetUploadModal
        open={showAssetModal}
        onOpenChange={setShowAssetModal}
        templateId={templateId}
        onAssetInserted={handleAssetInserted}
      />
    </div>
  );
};

export default TemplateDesigner2;
