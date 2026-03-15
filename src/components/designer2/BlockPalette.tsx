import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Type, Heading, Image, FileText, PenTool, Table, Minus,
  Paperclip, FileUp, FileCode, Tag, ChevronDown,
} from "lucide-react";
import type { BlockType } from "@/types/templateDesigner";

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
  onInsertAsset?: () => void;
}

const BLOCK_GROUPS = [
  {
    label: "Contenido",
    items: [
      { type: "text" as BlockType, label: "Texto", icon: Type, disabled: false },
      { type: "heading" as BlockType, label: "Título", icon: Heading, disabled: false },
      { type: "table" as BlockType, label: "Tabla", icon: Table, disabled: false },
      { type: "placeholder_chip" as BlockType, label: "Variable", icon: Tag, disabled: false },
    ],
  },
  {
    label: "Media",
    items: [
      { type: "image" as BlockType, label: "Imagen", icon: Image, disabled: false },
      { type: "attachment_card" as BlockType, label: "Adjunto", icon: Paperclip, disabled: false },
    ],
  },
  {
    label: "Documentos",
    items: [
      { type: "pdf_embed" as BlockType, label: "PDF Embed", icon: FileText, disabled: false },
      { type: "docx_embed" as BlockType, label: "DOCX", icon: FileCode, disabled: true },
    ],
  },
  {
    label: "Firma",
    items: [
      { type: "signature_block" as BlockType, label: "Firma", icon: PenTool, disabled: false },
    ],
  },
  {
    label: "Diseño",
    items: [
      { type: "page_break" as BlockType, label: "Salto Página", icon: Minus, disabled: false },
    ],
  },
];

export const BlockPalette: React.FC<BlockPaletteProps> = ({ onAddBlock, onInsertAsset }) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(BLOCK_GROUPS.map((g) => [g.label, true]))
  );

  const toggle = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bloques
        </h3>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-3">
          {onInsertAsset && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-dashed text-[11px] h-7 mb-2"
              onClick={onInsertAsset}
            >
              <FileUp className="h-3.5 w-3.5" />
              Insertar Documento
            </Button>
          )}

          {BLOCK_GROUPS.map((group) => (
            <Collapsible
              key={group.label}
              open={openGroups[group.label]}
              onOpenChange={() => toggle(group.label)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                {group.label}
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-150 ${
                    openGroups[group.label] ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-1 py-1">
                  {group.items.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => !item.disabled && onAddBlock(item.type)}
                      disabled={item.disabled}
                      className={`flex flex-col items-center gap-1 rounded-md px-1 py-2 text-center transition-colors duration-150 ${
                        item.disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-accent cursor-pointer"
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 ${
                          item.disabled
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[10px] font-medium leading-tight truncate w-full">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
