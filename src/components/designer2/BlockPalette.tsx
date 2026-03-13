import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Type,
  Heading,
  Image,
  FileText,
  PenTool,
  Table,
  Minus,
  Paperclip,
  FileUp,
  FileCode,
  Tag,
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
      { type: "text" as BlockType, label: "Texto", icon: Type, desc: "Párrafo o cláusula" },
      { type: "heading" as BlockType, label: "Título", icon: Heading, desc: "Encabezado H1-H3" },
      { type: "table" as BlockType, label: "Tabla", icon: Table, desc: "Tabla dinámica" },
      { type: "placeholder_chip" as BlockType, label: "Variable", icon: Tag, desc: "Placeholder visual" },
    ],
  },
  {
    label: "Media",
    items: [
      { type: "image" as BlockType, label: "Imagen", icon: Image, desc: "Logo, sello, imagen" },
      { type: "attachment_card" as BlockType, label: "Adjunto", icon: Paperclip, desc: "Tarjeta de documento" },
    ],
  },
  {
    label: "Documentos",
    items: [
      { type: "pdf_embed" as BlockType, label: "PDF Embed", icon: FileText, desc: "Páginas reales de PDF" },
      { type: "docx_embed" as BlockType, label: "DOCX Embed", icon: FileCode, desc: "Próximamente", disabled: true },
    ],
  },
  {
    label: "Firma",
    items: [
      { type: "signature_block" as BlockType, label: "Firma", icon: PenTool, desc: "Bloque de firma legal" },
    ],
  },
  {
    label: "Diseño",
    items: [
      { type: "page_break" as BlockType, label: "Salto de Página", icon: Minus, desc: "Nueva página" },
    ],
  },
];

export const BlockPalette: React.FC<BlockPaletteProps> = ({ onAddBlock, onInsertAsset }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Bloques</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="px-3 pb-3 space-y-4">
            {onInsertAsset && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                  onClick={onInsertAsset}
                >
                  <FileUp className="h-4 w-4" />
                  Insertar Documento
                </Button>
                <Separator />
              </>
            )}
            {BLOCK_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onAddBlock(item.type)}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-accent transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
