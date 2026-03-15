import React, { useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, MousePointer } from "lucide-react";
import { CanvasBlock, POSITIONED_TYPES } from "@/components/designer2/CanvasBlock";
import { CanvasFieldOverlay } from "@/components/designer2/CanvasFieldOverlay";
import type { TemplateBlock, FieldType, SignerRole } from "@/types/templateDesigner";
import DOMPurify from "dompurify";

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
      }
    },
    [onSelectBlock]
  );

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onZoomChange(Math.max(50, zoom - 10))}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] font-medium w-10 text-center tabular-nums">
            {zoom}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="text-[11px] text-muted-foreground">
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
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center py-6"
        onClick={handleCanvasClick}
        data-canvas="true"
      >
        <div
          className="relative bg-background border shadow-lg"
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
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
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.w}%`,
                height: `${block.h}%`,
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
          />
        </div>
      </div>
    </div>
  );
};
