import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, MousePointer, Maximize, Columns, Download, Printer, Save, Eye, Upload, Trash2 } from "lucide-react";
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
  pageBackgrounds: Record<number, string>;
  selectedFieldId: string | null;
  onFieldSelect: (id: string | null) => void;
  onPageChange: (page: number) => void;
  templateName?: string;
  onTemplateNameChange?: (name: string) => void;
  onSave?: () => void;
  onPreview?: () => void;
  onUploadPdf?: () => void;
  onDeleteAsset?: () => void;
  hasAsset?: boolean;
}

const A4_W = 794;
const A4_H = 1123;
const PAGE_GAP = 24;

/* ─── Empty Canvas Dropzone ─── */
const EmptyCanvasDropzone: React.FC<{ onUploadPdf?: () => void }> = ({ onUploadPdf }) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center">
      <Upload className="h-8 w-8 text-muted-foreground/60" />
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">Sin documento base</p>
      <p className="text-[11px] text-muted-foreground mt-1">
        Arrastrá un PDF aquí o hacé click para seleccionar
      </p>
    </div>
    {onUploadPdf && (
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onUploadPdf}>
        <Upload className="h-3.5 w-3.5" />
        Subir PDF
      </Button>
    )}
  </div>
);

/* ─── Canvas Toolbar ─── */
const CanvasToolbar: React.FC<{
  currentPage: number;
  totalPages: number;
  zoom: number;
  onZoomChange: (z: number) => void;
  placementActive: boolean;
  templateName?: string;
  onTemplateNameChange?: (name: string) => void;
  onSave?: () => void;
  onPreview?: () => void;
  onDeleteAsset?: () => void;
  hasAsset?: boolean;
  fitWidth: () => void;
  fitPage: () => void;
  pageBackgrounds: Record<number, string>;
}> = ({
  currentPage, totalPages, zoom, onZoomChange,
  placementActive, templateName, onTemplateNameChange,
  onSave, onPreview, onDeleteAsset, hasAsset, fitWidth, fitPage, pageBackgrounds,
}) => (
  <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background/90 backdrop-blur-sm shrink-0 gap-2">
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground font-medium tabular-nums min-w-[50px] text-center">
        {currentPage} / {totalPages}
      </span>

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
    </div>

    {/* Editable template name */}
    {onTemplateNameChange ? (
      <Input
        className="h-7 text-[12px] font-medium max-w-[200px] bg-transparent border-transparent hover:border-border focus:border-primary text-center"
        value={templateName || ""}
        onChange={(e) => onTemplateNameChange(e.target.value)}
        placeholder="Nombre del template..."
      />
    ) : (
      templateName && (
        <span className="text-[12px] font-medium text-foreground truncate max-w-[200px]">{templateName}</span>
      )
    )}

    <div className="flex items-center gap-1">
      {placementActive && (
        <Badge variant="default" className="gap-1 text-[10px] animate-pulse">
          <MousePointer className="h-3 w-3" />
          Click para colocar
        </Badge>
      )}

      {hasAsset && onDeleteAsset && (
        <>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-destructive hover:text-destructive" onClick={onDeleteAsset}>
            <Trash2 className="h-3.5 w-3.5" /> Eliminar PDF
          </Button>
        </>
      )}

      <Separator orientation="vertical" className="h-5 mx-1" />

      {onPreview && (
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5" /> Vista previa
        </Button>
      )}

      {onSave && (
        <Button type="button" variant="default" size="sm" className="h-7 gap-1 text-[11px]" onClick={onSave}>
          <Save className="h-3.5 w-3.5" /> Guardar
        </Button>
      )}

      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Imprimir"
        onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Descargar PDF"
        onClick={() => {
          const bg = pageBackgrounds[1];
          if (bg) window.open(bg, "_blank");
        }}
        disabled={!pageBackgrounds[1]}>
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

/* ─── Main Component ─── */
export const OpenSignCanvas: React.FC<OpenSignCanvasProps> = ({
  templateId, blocks, currentPage, zoom, onZoomChange, totalPages,
  selectedBlockId, onSelectBlock, onDeleteBlock, onDuplicateBlock,
  onToggleLock, onToggleVisibility, onUpdatePosition,
  placementActive, activeFieldType, activeSignerRole,
  pageBackgrounds, selectedFieldId, onFieldSelect, onPageChange,
  templateName, onTemplateNameChange, onSave, onPreview, onUploadPdf,
  onDeleteAsset, hasAsset,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: "canvas-drop-zone" });

  const setCanvasRefs = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setDropRef(el);
  }, [setDropRef]);

  usePdfPinchZoom(containerRef, zoom, onZoomChange);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ─── IntersectionObserver: sync currentPage on scroll ─── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || totalPages <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestPage = currentPage;
        let bestRatio = 0;
        for (const entry of entries) {
          const pageNum = Number(entry.target.getAttribute("data-page-num"));
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestPage = pageNum;
          }
        }
        if (bestRatio > 0.3 && bestPage !== currentPage) {
          onPageChange(bestPage);
        }
      },
      { root: container, threshold: [0.3, 0.5, 0.7] }
    );

    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [totalPages, currentPage, onPageChange]);

  /* ─── Scroll to page when sidebar click ─── */
  useEffect(() => {
    const el = pageRefs.current.get(currentPage);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPage]);

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

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas) {
        onSelectBlock(null);
        onFieldSelect(null);
      }
    },
    [onSelectBlock, onFieldSelect]
  );

  const isEmpty = totalPages === 0 && blocks.length === 0;

  /* ─── Per-page block filtering ─── */
  const blocksByPage = useMemo(() => {
    const map: Record<number, TemplateBlock[]> = {};
    for (let p = 1; p <= totalPages; p++) map[p] = [];
    for (const b of blocks) {
      if (b.is_visible && map[b.page]) map[b.page].push(b);
    }
    return map;
  }, [blocks, totalPages]);

  return (
    <div className="flex flex-col h-full bg-neutral-200 dark:bg-neutral-900">
      <CanvasToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        onZoomChange={onZoomChange}
        placementActive={placementActive}
        templateName={templateName}
        onTemplateNameChange={onTemplateNameChange}
        onSave={onSave}
        onPreview={onPreview}
        onDeleteAsset={onDeleteAsset}
        hasAsset={hasAsset}
        fitWidth={fitWidth}
        fitPage={fitPage}
        pageBackgrounds={pageBackgrounds}
      />

      {/* Canvas area — all pages stacked */}
      <div
        ref={setCanvasRefs}
        className={`flex-1 overflow-auto flex flex-col items-center py-6 transition-colors ${isOver ? "bg-primary/5 ring-2 ring-inset ring-primary/20" : ""}`}
        onClick={handleCanvasClick}
        data-canvas="true"
      >
        {isEmpty ? (
          <div className="w-full max-w-md my-auto">
            <EmptyCanvasDropzone onUploadPdf={onUploadPdf} />
          </div>
        ) : (
          Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const pageBg = pageBackgrounds[pageNum];
            const pageBlocks = blocksByPage[pageNum] || [];
            const flowBlocks = pageBlocks.filter((b) => !POSITIONED_TYPES.has(b.block_type));
            const positionedBlocks = pageBlocks.filter((b) => POSITIONED_TYPES.has(b.block_type));

            return (
              {/* Outer wrapper: unscaled, carries data-a4-page for coordinate detection */}
              <div
                key={pageNum}
                ref={(el) => { if (el) pageRefs.current.set(pageNum, el); else pageRefs.current.delete(pageNum); }}
                data-page-num={pageNum}
                data-a4-page="true"
                className="relative"
                style={{
                  width: A4_W * (zoom / 100),
                  height: A4_H * (zoom / 100),
                  marginBottom: PAGE_GAP,
                }}
              >
                {/* Page number indicator */}
                <div className="absolute -top-5 left-0 text-[10px] text-muted-foreground font-medium">
                  Pág. {pageNum}
                </div>

                {/* Inner scaled A4 container: visual rendering */}
                <div
                  className="absolute top-0 left-0 bg-background shadow-2xl ring-1 ring-border/40"
                  style={{
                    width: A4_W,
                    height: A4_H,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "top left",
                    ...(pageBg
                      ? {
                          backgroundImage: `url(${pageBg})`,
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
                </div>

                {/* Field overlay: positioned on the OUTER (unscaled) wrapper
                    so getBoundingClientRect() matches pointer coordinates */}
                <CanvasFieldOverlay
                  templateId={templateId}
                  activeFieldType={activeFieldType}
                  activeSignerRole={activeSignerRole}
                  placementActive={placementActive}
                  currentPage={pageNum}
                  selectedFieldId={selectedFieldId}
                  onFieldSelect={onFieldSelect}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
