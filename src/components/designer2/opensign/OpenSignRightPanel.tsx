import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Layers, Settings2, History } from "lucide-react";
import { FieldOverlay } from "@/components/designer2/FieldOverlay";
import { BlockPropertyPanel } from "@/components/designer2/BlockPropertyPanel";
import { VersionPanel } from "@/components/designer2/VersionPanel";
import type { TemplateBlock, TemplateField, FieldType, SignerRole, BlockType } from "@/types/templateDesigner";
import { cn } from "@/lib/utils";

interface OpenSignRightPanelProps {
  templateId: string;
  selectedBlock: TemplateBlock | null;
  onUpdateBlock: (updates: Partial<TemplateBlock>) => void;
  onAddBlock?: (type: BlockType) => void;
  fields: TemplateField[];
  activeRole: SignerRole;
  onRoleChange: (role: SignerRole) => void;
  activeFieldType: FieldType;
  onFieldTypeChange: (type: FieldType) => void;
  placementActive: boolean;
  onTogglePlacement: (active: boolean) => void;
}

const ROLES: { value: SignerRole; label: string; colorClass: string; borderClass: string }[] = [
  { value: "titular", label: "Titular / Contratante", colorClass: "bg-blue-500", borderClass: "border-blue-500" },
  { value: "adherente", label: "Adherente", colorClass: "bg-green-500", borderClass: "border-green-500" },
  { value: "contratada", label: "Contratada / Empresa", colorClass: "bg-purple-500", borderClass: "border-purple-500" },
];

export const OpenSignRightPanel: React.FC<OpenSignRightPanelProps> = ({
  templateId,
  selectedBlock,
  onUpdateBlock,
  onAddBlock,
  fields,
  activeRole,
  onRoleChange,
  activeFieldType,
  onFieldTypeChange,
  placementActive,
  onTogglePlacement,
}) => {
  return (
    <aside className="flex flex-col border-l bg-background h-full">
      <Tabs defaultValue="roles" className="flex flex-col h-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 px-1 h-10 shrink-0">
          <TabsTrigger value="roles" className="gap-1 text-[11px] px-2">
            <Users className="h-3 w-3" />
            Firmantes
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-1 text-[11px] px-2">
            <Layers className="h-3 w-3" />
            Campos
          </TabsTrigger>
          <TabsTrigger value="props" className="gap-1 text-[11px] px-2">
            <Settings2 className="h-3 w-3" />
            Props
          </TabsTrigger>
          <TabsTrigger value="versions" className="gap-1 text-[11px] px-2">
            <History className="h-3 w-3" />
            Vers.
          </TabsTrigger>
        </TabsList>

        {/* ── Firmantes ── */}
        <TabsContent value="roles" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Roles / Firmantes
              </p>
              {ROLES.map((role) => {
                const count = fields.filter((f) => f.signer_role === role.value).length;
                const isActive = activeRole === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => onRoleChange(role.value)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                      isActive
                        ? `${role.borderClass} bg-muted/50`
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className={cn("h-3 w-3 rounded-full shrink-0", role.colorClass)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate">{role.label}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {count}
                    </Badge>
                  </button>
                );
              })}
              <p className="text-[10px] text-muted-foreground pt-2">
                Seleccioná un rol antes de colocar campos en el canvas.
              </p>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Campos ── */}
        <TabsContent value="fields" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <FieldOverlay
              templateId={templateId}
              placementActive={placementActive}
              onTogglePlacement={onTogglePlacement}
              activeFieldType={activeFieldType}
              activeSignerRole={activeRole}
              onFieldTypeChange={onFieldTypeChange}
              onSignerRoleChange={onRoleChange}
            />
          </ScrollArea>
        </TabsContent>

        {/* ── Propiedades ── */}
        <TabsContent value="props" className="flex-1 m-0 overflow-hidden">
          <BlockPropertyPanel
            block={selectedBlock}
            onUpdate={onUpdateBlock}
            onAddBlock={onAddBlock}
            templateId={templateId}
          />
        </TabsContent>

        {/* ── Versiones ── */}
        <TabsContent value="versions" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <VersionPanel templateId={templateId} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
};
