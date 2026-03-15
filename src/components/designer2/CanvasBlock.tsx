import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GripVertical, Trash2, Lock, Unlock, Eye, EyeOff, Copy,
  Type, Heading, Image, FileText, PenTool, Table, Minus, Paperclip, FileCode, Tag, Move,
} from "lucide-react";
import type { TemplateBlock, BlockType, SignerRole, FieldType } from "@/types/templateDesigner";
import { PageFieldOverlay } from "./PageFieldOverlay";
import DOMPurify from "dompurify";
import type { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";

/* ─── Constants ─── */

export const POSITIONED_TYPES = new Set<BlockType>([
  "image", "signature_block", "placeholder_chip",
  "attachment_card", "pdf_embed", "docx_embed",
]);

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  text: Type, heading: Heading, image: Image, attachment_card: Paperclip,
  pdf_embed: FileText, docx_embed: FileCode, signature_block: PenTool,
  table: Table, page_break: Minus, placeholder_chip: Tag,
};

const BLOCK_LABELS: Record<BlockType, string> = {
  text: "Texto", heading: "Título", image: "Imagen", attachment_card: "Adjunto",
  pdf_embed: "PDF Embed", docx_embed: "DOCX Embed", signature_block: "Firma",
  table: "Tabla", page_break: "Salto de Página", placeholder_chip: "Variable",
};

/* ─── Props ─── */

interface CanvasBlockProps {
  block: TemplateBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  onUpdatePosition?: (x: number, y: number, w: number, h: number) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  templateId?: string;
  fieldPlacementRole?: SignerRole;
  fieldPlacementType?: FieldType;
}

/* ─── Content Renderer (extracted) ─── */

const BlockContentRenderer: React.FC<{
  block: TemplateBlock;
  isSelected: boolean;
  templateId?: string;
  fieldPlacementRole: SignerRole;
  fieldPlacementType: FieldType;
}> = ({ block, isSelected, templateId, fieldPlacementRole, fieldPlacementType }) => {
  const content = block.content as any;
  const [resolvedImageUrl, setResolvedImageUrl] = useState("");
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [containerDims, setContainerDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = pageContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDims({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (block.block_type === "image" && content.src) {
      setResolvedImageUrl(content.src);
    }
  }, [block.block_type, content.src]);

  switch (block.block_type) {
    case "text":
      return (
        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.html || "") }}
        />
      );

    case "heading": {
      const HTag = (`h${content.level || 1}` as keyof JSX.IntrinsicElements);
      return <HTag className="font-bold text-foreground">{content.text || "Título"}</HTag>;
    }

    case "image":
      return (
        <div className="flex items-center justify-center bg-muted/30 rounded-md min-h-[40px] w-full h-full">
          {resolvedImageUrl ? (
            <img src={resolvedImageUrl} alt={content.alt || ""} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Image className="h-6 w-6" />
              <span className="text-[9px]">Sin imagen</span>
            </div>
          )}
        </div>
      );

    case "pdf_embed":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>PDF — {content.page_selection?.pages?.length || "todas"} págs</span>
          </div>
          {content.page_previews?.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {content.page_previews.slice(0, 9).map((p: any, i: number) => (
                <div key={i} className="relative" ref={i === 0 ? pageContainerRef : undefined}>
                  {p.preview_image_url ? (
                    <div className="relative">
                      <img src={p.preview_image_url} alt={`Pág ${p.page_number}`} className="w-full aspect-[210/297] object-cover rounded border" />
                      {templateId && content.allow_overlay_fields && isSelected && (
                        <PageFieldOverlay
                          templateId={templateId}
                          blockId={block.id}
                          pageNumber={p.page_number}
                          signerRole={fieldPlacementRole}
                          fieldType={fieldPlacementType}
                          containerWidth={containerDims.w}
                          containerHeight={containerDims.h}
                        />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 text-[7px] font-medium bg-background/80 rounded px-0.5">{p.page_number}</span>
                    </div>
                  ) : (
                    <div className="aspect-[210/297] bg-muted/50 rounded border flex items-center justify-center text-[9px] text-muted-foreground">
                      Pág {p.page_number}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-[210/297] max-h-24 bg-muted/30 rounded border border-dashed flex items-center justify-center text-[9px] text-muted-foreground">
              Preview no disponible
            </div>
          )}
        </div>
      );

    case "docx_embed":
      return (
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-muted-foreground">
          <FileCode className="h-5 w-5" />
          <span className="text-[10px]">DOCX embebido (próximamente)</span>
        </div>
      );

    case "attachment_card":
      return (
        <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-dashed">
          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium truncate">{content.title || "Documento adjunto"}</p>
            <p className="text-[9px] text-muted-foreground truncate">{content.description || ""}</p>
          </div>
        </div>
      );

    case "signature_block":
      return (
        <div className="border-t-2 border-foreground/30 pt-2 space-y-0.5">
          <p className="text-[11px] font-medium">{content.label || "Firma"}</p>
          <div className="h-8 bg-muted/20 rounded border border-dashed flex items-center justify-center text-[9px] text-muted-foreground">
            Firma — {content.signer_role || "titular"}
          </div>
          <div className="flex gap-2 text-[8px] text-muted-foreground">
            {content.show_name && <span>Nombre</span>}
            {content.show_dni && <span>C.I.</span>}
            {content.show_timestamp && <span>Fecha</span>}
          </div>
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] border">
            <thead>
              <tr className="bg-muted/30">
                {(content.columns || []).map((col: any, i: number) => (
                  <th key={i} className="border px-1.5 py-0.5 text-left font-medium">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {(content.columns || []).map((_: any, i: number) => (
                  <td key={i} className="border px-1.5 py-0.5 text-muted-foreground italic">...</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );

    case "page_break":
      return (
        <div className="flex items-center gap-2 py-0.5">
          <Minus className="h-3 w-3 text-muted-foreground" />
          <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Salto</span>
          <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
          <Minus className="h-3 w-3 text-muted-foreground" />
        </div>
      );

    case "placeholder_chip":
      return (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Tag className="h-2.5 w-2.5" />
          {`{{${content.placeholder_key || "variable"}}}`}
        </Badge>
      );

    default:
      return <p className="text-[10px] text-muted-foreground">Bloque desconocido</p>;
  }
};

/* ─── Resize Handle ─── */

const ResizeHandle: React.FC<{
  position: "br" | "r" | "b";
  onResizeStart: (e: React.MouseEvent, direction: "br" | "r" | "b") => void;
}> = ({ position, onResizeStart }) => {
  const cls =
    position === "br"
      ? "absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-primary-foreground rounded-sm cursor-nwse-resize z-20"
      : position === "r"
      ? "absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-5 bg-primary/60 rounded-sm cursor-ew-resize z-20"
      : "absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-5 bg-primary/60 rounded-sm cursor-ns-resize z-20";

  return (
    <div
      className={cls}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onResizeStart(e, position);
      }}
    />
  );
};

/* ─── Main Component ─── */

export const CanvasBlock: React.FC<CanvasBlockProps> = ({
  block, isSelected, onSelect, onDelete, onDuplicate,
  onToggleLock, onToggleVisibility, onUpdatePosition,
  dragHandleProps, templateId,
  fieldPlacementRole = "titular", fieldPlacementType = "signature",
}) => {
  const Icon = BLOCK_ICONS[block.block_type] || Type;
  const label = BLOCK_LABELS[block.block_type] || block.block_type;
  const isPositioned = POSITIONED_TYPES.has(block.block_type);
  const blockRef = useRef<HTMLDivElement>(null);

  /* ─── Drag state (positioned blocks only) ─── */
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number; ow: number; oh: number; dir?: string }>({ mx: 0, my: 0, ox: 0, oy: 0, ow: 0, oh: 0 });

  const getParentRect = useCallback(() => {
    const parent = blockRef.current?.parentElement;
    if (!parent) return { width: 1, height: 1 };
    return { width: parent.clientWidth, height: parent.clientHeight };
  }, []);

  /* ─── Drag handlers ─── */
  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    if (block.is_locked || !isPositioned || !onUpdatePosition) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: block.x, oy: block.y, ow: block.w, oh: block.h };
  }, [block.is_locked, block.x, block.y, block.w, block.h, isPositioned, onUpdatePosition]);

  const handleResizeStart = useCallback((e: React.MouseEvent, dir: "br" | "r" | "b") => {
    if (block.is_locked || !onUpdatePosition) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: block.x, oy: block.y, ow: block.w, oh: block.h, dir };
  }, [block.is_locked, block.x, block.y, block.w, block.h, onUpdatePosition]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const parentRect = getParentRect();
      const dx = ((e.clientX - dragStart.current.mx) / parentRect.width) * 100;
      const dy = ((e.clientY - dragStart.current.my) / parentRect.height) * 100;

      if (isDragging) {
        const nx = Math.round(Math.max(0, Math.min(100 - dragStart.current.ow, dragStart.current.ox + dx)));
        const ny = Math.round(Math.max(0, Math.min(100 - dragStart.current.oh, dragStart.current.oy + dy)));
        if (blockRef.current?.parentElement) {
          const el = blockRef.current;
          el.style.left = `${nx}%`;
          el.style.top = `${ny}%`;
        }
      }
      if (isResizing) {
        const dir = dragStart.current.dir;
        if (dir === "r" || dir === "br") {
          const nw = Math.round(Math.max(5, Math.min(100 - dragStart.current.ox, dragStart.current.ow + dx)));
          if (blockRef.current) blockRef.current.style.width = `${nw}%`;
        }
        if (dir === "b" || dir === "br") {
          const nh = Math.round(Math.max(3, Math.min(100 - dragStart.current.oy, dragStart.current.oh + dy)));
          if (blockRef.current) blockRef.current.style.height = `${nh}%`;
        }
      }
    };

    const handleUp = (e: MouseEvent) => {
      const parentRect = getParentRect();
      const dx = ((e.clientX - dragStart.current.mx) / parentRect.width) * 100;
      const dy = ((e.clientY - dragStart.current.my) / parentRect.height) * 100;

      let nx = dragStart.current.ox, ny = dragStart.current.oy;
      let nw = dragStart.current.ow, nh = dragStart.current.oh;

      if (isDragging) {
        nx = Math.round(Math.max(0, Math.min(100 - nw, dragStart.current.ox + dx)));
        ny = Math.round(Math.max(0, Math.min(100 - nh, dragStart.current.oy + dy)));
      }
      if (isResizing) {
        const dir = dragStart.current.dir;
        if (dir === "r" || dir === "br") nw = Math.round(Math.max(5, Math.min(100 - nx, dragStart.current.ow + dx)));
        if (dir === "b" || dir === "br") nh = Math.round(Math.max(3, Math.min(100 - ny, dragStart.current.oh + dy)));
      }

      onUpdatePosition?.(nx, ny, nw, nh);
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, isResizing, getParentRect, onUpdatePosition]);

  /* ─── Toolbar ─── */
  const toolbar = (
    <div className="absolute -top-3 right-1 z-30 hidden group-hover:flex items-center gap-0.5 bg-card border rounded-md shadow-sm px-0.5 py-0.5">
      {isPositioned && (
        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 cursor-move" onMouseDown={handleDragMouseDown}>
          <Move className="h-3 w-3" />
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onToggleLock(); }}>
        {block.is_locked ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}>
        {block.is_visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
        <Copy className="h-2.5 w-2.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <Trash2 className="h-2.5 w-2.5" />
      </Button>
    </div>
  );

  /* ─── Render ─── */
  return (
    <Card
      ref={blockRef}
      className={`relative group transition-all duration-150 ${
        isSelected ? "ring-2 ring-primary/60 shadow-md" : "hover:ring-1 hover:ring-border"
      } ${!block.is_visible ? "opacity-40" : ""} ${block.is_locked ? "cursor-not-allowed" : isPositioned ? "cursor-move" : "cursor-pointer"}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={isPositioned && !block.is_locked ? handleDragMouseDown : undefined}
    >
      {toolbar}

      {/* Resize handles for positioned blocks */}
      {isPositioned && isSelected && !block.is_locked && (
        <>
          <ResizeHandle position="br" onResizeStart={handleResizeStart} />
          <ResizeHandle position="r" onResizeStart={handleResizeStart} />
          <ResizeHandle position="b" onResizeStart={handleResizeStart} />
        </>
      )}

      <div className="p-2">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1">
          {!isPositioned && (
            <div {...(dragHandleProps || {})} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          )}
          <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          {isPositioned && (
            <span className="text-[8px] text-muted-foreground ml-auto">
              {Math.round(block.x)},{Math.round(block.y)} — {Math.round(block.w)}×{Math.round(block.h)}
            </span>
          )}
        </div>

        {/* Content */}
        <BlockContentRenderer
          block={block}
          isSelected={isSelected}
          templateId={templateId}
          fieldPlacementRole={fieldPlacementRole}
          fieldPlacementType={fieldPlacementType}
        />
      </div>
    </Card>
  );
};
