import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TemplateField } from "@/types/templateDesigner";

interface OpenSignPagesSidebarProps {
  pages: PageEntry[];
  currentPage: number;
  onPageChange: (page: number) => void;
  fields?: TemplateField[];
}

export interface PageEntry {
  page: number;
  previewUrl?: string | null;
}

export const OpenSignPagesSidebar: React.FC<OpenSignPagesSidebarProps> = ({
  pages,
  currentPage,
  onPageChange,
  fields = [],
}) => {
  return (
    <aside className="flex flex-col border-r bg-muted/30 h-full">
      <div className="px-3 py-2 border-b">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Páginas
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-2">
          {pages.map((p) => {
            const fieldCount = fields.filter((f) => f.page === p.page).length;
            return (
              <button
                key={p.page}
                type="button"
                onClick={() => onPageChange(p.page)}
                className={cn(
                  "relative rounded-md border-2 transition-all overflow-hidden",
                  currentPage === p.page
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40"
                )}
              >
                {p.previewUrl ? (
                  <img
                    src={p.previewUrl}
                    alt={`Página ${p.page}`}
                    className="w-full aspect-[210/297] object-cover bg-background"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full aspect-[210/297] bg-background flex items-center justify-center">
                    <span className="text-2xl font-bold text-muted-foreground/30">{p.page}</span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-background/80 backdrop-blur-sm text-center py-0.5 flex items-center justify-center gap-1.5">
                  <span className="text-[10px] font-medium text-foreground">{p.page}</span>
                  {fieldCount > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] font-semibold">
                      {fieldCount}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
};
