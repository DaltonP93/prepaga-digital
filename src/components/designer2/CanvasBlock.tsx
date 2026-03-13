import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GripVertical, Trash2, Lock, Unlock, Eye, EyeOff, Copy,
  Type, Heading, Image, FileText, PenTool, Table, Minus, Paperclip, FileCode, Tag,
} from "lucide-react";
import type { TemplateBlock, BlockType, SignerRole, FieldType } from "@/types/templateDesigner";
import { PageFieldOverlay } from "./PageFieldOverlay";
import { getAssetSignedUrl } from "@/lib/assetUrlHelper";
import DOMPurify from "dompurify";
import type { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";

interface CanvasBlockProps {
  block: TemplateBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  templateId?: string;
  fieldPlacementRole?: SignerRole;
  fieldPlacementType?: FieldType;
}

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

export const CanvasBlock: React.FC<CanvasBlockProps> = ({
  block, isSelected, onSelect, onDelete, onDuplicate,
  onToggleLock, onToggleVisibility, dragHandleProps,
  templateId, fieldPlacementRole = "titular", fieldPlacementType = "signature",
}) => {
  const Icon = BLOCK_ICONS[block.block_type] || Type;
  const label = BLOCK_LABELS[block.block_type] || block.block_type;

  // For images stored in private bucket, resolve signed URLs
  const [resolvedImageUrl, setResolvedImageUrl] = useState("");
  const content = block.content as any;

  useEffect(() => {
    if (block.block_type === "image" && content.asset_id && !content.src?.startsWith("http")) {
      // Content src might be a storage path, resolve it
    } else if (block.block_type === "image" && content.src) {
      setResolvedImageUrl(content.src);
    }
  }, [block.block_type, content.src, content.asset_id]);

  const renderContent = () => {
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
          <div className="flex items-center justify-center p-4 bg-muted/30 rounded-md min-h-[80px]">
            {resolvedImageUrl ? (
              <img src={resolvedImageUrl} alt={content.alt || ""} className="max-h-32 object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Image className="h-8 w-8" />
                <span className="text-xs">Sin imagen</span>
              </div>
            )}
          </div>
        );

      case "pdf_embed":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>PDF embebido — {content.page_selection?.pages?.length || "todas"} páginas</span>
            </div>
            {content.page_previews?.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {content.page_previews.slice(0, 9).map((p: any, i: number) => (
                  <div key={i} className="relative">
                    {p.preview_image_url ? (
                      <div className="relative">
                        <img
                          src={p.preview_image_url}
                          alt={`Pág ${p.page_number}`}
                          className="w-full aspect-[210/297] object-cover rounded border"
                        />
                        {/* Field overlay on each page */}
                        {templateId && content.allow_overlay_fields && isSelected && (
                          <PageFieldOverlay
                            templateId={templateId}
                            blockId={block.id}
                            pageNumber={p.page_number}
                            signerRole={fieldPlacementRole}
                            fieldType={fieldPlacementType}
                            containerWidth={0}
                            containerHeight={0}
                          />
                        )}
                        <span className="absolute bottom-1 right-1 text-[8px] font-medium bg-background/80 rounded px-1">
                          {p.page_number}
                        </span>
                      </div>
                    ) : (
                      <div className="aspect-[210/297] bg-muted/50 rounded border flex items-center justify-center text-xs text-muted-foreground">
                        Pág {p.page_number}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-[210/297] max-h-40 bg-muted/30 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                Preview no disponible
              </div>
            )}
          </div>
        );

      case "docx_embed":
        return (
          <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-md text-muted-foreground">
            <FileCode className="h-6 w-6" />
            <span className="text-sm">Documento DOCX embebido (próximamente)</span>
          </div>
        );

      case "attachment_card":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-dashed">
            <Paperclip className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{content.title || "Documento adjunto"}</p>
              <p className="text-xs text-muted-foreground truncate">{content.description || ""}</p>
            </div>
          </div>
        );

      case "signature_block":
        return (
          <div className="border-t-2 border-foreground/30 pt-3 space-y-1">
            <p className="text-sm font-medium">{content.label || "Firma"}</p>
            <div className="h-12 bg-muted/20 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">
              Espacio de firma — {content.signer_role || "titular"}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              {content.show_name && <span>Nombre</span>}
              {content.show_dni && <span>C.I.</span>}
              {content.show_timestamp && <span>Fecha</span>}
            </div>
          </div>
        );

      case "table":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border">
              <thead>
                <tr className="bg-muted/30">
                  {(content.columns || []).map((col: any, i: number) => (
                    <th key={i} className="border px-2 py-1 text-left font-medium">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {(content.columns || []).map((_: any, i: number) => (
                    <td key={i} className="border px-2 py-1 text-muted-foreground italic">...</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        );

      case "page_break":
        return (
          <div className="flex items-center gap-2 py-1">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Salto de página</span>
            <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
            <Minus className="h-4 w-4 text-muted-foreground" />
          </div>
        );

      case "placeholder_chip":
        return (
          <Badge variant="secondary" className="gap-1">
            <Tag className="h-3 w-3" />
            {`{{${content.placeholder_key || "variable"}}}`}
          </Badge>
        );

      default:
        return <p className="text-sm text-muted-foreground">Bloque desconocido</p>;
    }
  };

  return (
    <Card
      className={`relative group cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary shadow-md" : "hover:ring-1 hover:ring-border"
      } ${!block.is_visible ? "opacity-40" : ""} ${block.is_locked ? "cursor-not-allowed" : ""}`}
      onClick={onSelect}
    >
      {/* Toolbar */}
      <div className="absolute -top-3 right-2 z-10 hidden group-hover:flex items-center gap-0.5 bg-card border rounded-md shadow-sm px-1 py-0.5">
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onToggleLock(); }}>
          {block.is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}>
          {block.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
          <Copy className="h-3 w-3" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-3">
        {/* Header with drag handle */}
        <div className="flex items-center gap-2 mb-2">
          <div {...(dragHandleProps || {})} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </Card>
  );
};
