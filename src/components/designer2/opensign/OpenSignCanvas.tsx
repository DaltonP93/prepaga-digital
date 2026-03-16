import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ZoomIn, ZoomOut, MousePointer, Maximize, Columns, ChevronUp, ChevronDown, Download, Printer } from "lucide-react";
import { CanvasBlock, POSITIONED_TYPES } from "@/components/designer2/CanvasBlock";
import { CanvasFieldOverlay } from "@/components/designer2/CanvasFieldOverlay";
import usePdfPinchZoom from "@/hooks/usePdfPinchZoom";
import type { TemplateBlock, FieldType, SignerRole } from "@/types/templateDesigner";

interface OpenSignCanvasProps {
  templateId: string;
  blocks: TemplateBlock[];
  currentPage: number;
  zoom: number;
  onZoomChange: (z: number) => void;
  totalPages: number;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number, w: number, h: number) => void;
  placementActive: boolean;
  activeFieldType: FieldType;
  activeSignerRole: SignerRole;
  pageBackgroundUrl?: string;
  selectedFieldId: string | null;
  onFieldSelect: (id: string | null) => void;
  onPageChange: (page: number) => void;
}

const A4_W = 794;
const A4_H = 1123;

export const OpenSignCanvas: React.FC<OpenSignCanvasProps> = ({
  templateId,
  blocks,
  currentPage,
  zoom,
  onZoomChange,
  totalPages,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onToggleLock,
  onToggleVisibility,
  onUpdatePosition,
  placementActive,
  activeFieldType,
  activeSignerRole,
  pageBackgroundUrl,
  selectedFieldId,
  onFieldSelect,
  onPageChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Drop zone for @dnd-kit widgets
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: "canvas-drop-zone" });

  // Memoized ref callback to avoid render loop (setDropRef + containerRef)
  const setCanvasRefs = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setDropRef(el);
  }, [setDropRef]);

  // Pinch-to-zoom
  usePdfPinchZoom(containerRef, zoom, onZoomChange);

  // Observe container size for fit calculations
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard: arrow up/down for page nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "ArrowUp" && e.altKey) { e.preventDefault(); onPageChange(Math.max(1, currentPage - 1)); }
      if (e.key === "ArrowDown" && e.altKey) { e.preventDefault(); onPageChange(Math.min(totalPages, currentPage + 1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, totalPages, onPageChange]);

  const fitWidth = useCallback(() => {
    if (containerSize.w <= 0) return;
    const z = Math.floor(((containerSize.w - 48) / A4_W) * 100);
    onZoomChange(Math.max(30, Math.min(200, z)));
  }, [containerSize.w, onZoomChange]);

  const fitPage = useCallback(() => {
    if (containerSize.w <= 0 || containerSize.h <= 0) return;
    const zw = ((containerSize.w - 48) / A4_W) * 100;
    const zh = ((containerSize.h - 48) / A4_H) * 100;
    onZoomChange(Math.max(30, Math.min(200, Math.floor(Math.min(zw, zh)))));
  }, [containerSize, onZoomChange]);

  const pageBlocks = useMemo(
    () => blocks.filter((b) => b.page === currentPage && b.is_visible),
    [blocks, currentPage]
  );

  const flowBlocks = pageBlocks.filter((b) => !POSITIONED_TYPES.has(b.block_type));
  const positionedBlocks = pageBlocks.filter((b) => POSITIONED_TYPES.has(b.block_type));

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas) {
        onSelectBlock(null);
        onFieldSelect(null);
      }
    },
    [onSelectBlock, onFieldSelect]
  );

  return (
    <div className="flex flex-col h-full bg-neutral-200 dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-1">
          {/* Prev/Next page buttons */}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}
            title="Página anterior (Alt+↑)">
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}
            title="Página siguiente (Alt+↓)">
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onZoomChange(Math.max(30, zoom - 10))} disabled={zoom <= 30}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] font-medium w-10 text-center tabular-nums">{zoom}%</span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onZoomChange(Math.min(200, zoom + 10))} disabled={zoom >= 200}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={fitWidth} title="Ajustar al ancho">
            <Columns className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={fitPage} title="Ajustar a la página">
            <Maximize className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Imprimir"
            onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Descargar PDF"
            onClick={() => {
              if (pageBackgroundUrl) window.open(pageBackgroundUrl, "_blank");
            }}
            disabled={!pageBackgroundUrl}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="text-[11px] text-muted-foreground font-medium">
          Pág {currentPage} / {totalPages}
        </span>

        {placementActive && (
          <Badge variant="default" className="gap-1 text-[10px] animate-pulse">
            <MousePointer className="h-3 w-3" />
            Click para colocar
          </Badge>
        )}
      </div>

      {/* Canvas area */}
      <div
        ref={(el) => { (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el; setDropRef(el); }}
        className={`flex-1 overflow-auto flex justify-center items-start py-6 transition-colors ${isOver ? "bg-primary/5 ring-2 ring-inset ring-primary/20" : ""}`}
        onClick={handleCanvasClick}
        data-canvas="true"
      >
        <div
          data-a4-page="true"
          className="relative bg-background shadow-2xl ring-1 ring-border/40"
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            ...(pageBackgroundUrl
              ? {
                  backgroundImage: `url(${pageBackgroundUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }
              : {}),
          }}
          data-canvas="true"
        >
          {/* Flow blocks */}
          <div className="p-8 space-y-1" data-canvas="true">
            {flowBlocks.map((block) => (
              <CanvasBlock
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onDelete={() => onDeleteBlock(block.id)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onToggleLock={() => onToggleLock(block.id)}
                onToggleVisibility={() => onToggleVisibility(block.id)}
                templateId={templateId}
                fieldPlacementRole={activeSignerRole}
                fieldPlacementType={activeFieldType}
              />
            ))}
          </div>

          {/* Positioned blocks */}
          {positionedBlocks.map((block) => (
            <div
              key={block.id}
              className="absolute"
              style={{
                left: `${block.x}%`, top: `${block.y}%`,
                width: `${block.w}%`, height: `${block.h}%`,
                zIndex: block.z_index,
              }}
            >
              <CanvasBlock
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onDelete={() => onDeleteBlock(block.id)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onToggleLock={() => onToggleLock(block.id)}
                onToggleVisibility={() => onToggleVisibility(block.id)}
                onUpdatePosition={(x, y, w, h) => onUpdatePosition(block.id, x, y, w, h)}
                templateId={templateId}
                fieldPlacementRole={activeSignerRole}
                fieldPlacementType={activeFieldType}
              />
            </div>
          ))}

          {/* Field overlays */}
          <CanvasFieldOverlay
            templateId={templateId}
            activeFieldType={activeFieldType}
            activeSignerRole={activeSignerRole}
            placementActive={placementActive}
            currentPage={currentPage}
            selectedFieldId={selectedFieldId}
            onFieldSelect={onFieldSelect}
          />
        </div>
      </div>
    </div>
  );
};
