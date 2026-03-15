import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Layers, Settings2, History, Check } from "lucide-react";
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

const ROLES: {
  value: SignerRole;
  label: string;
  initial: string;
  bg: string;
  bgActive: string;
  bgHover: string;
  text: string;
  ring: string;
}[] = [
  {
    value: "titular",
    label: "Titular / Contratante",
    initial: "T",
    bg: "bg-blue-100",
    bgActive: "bg-blue-500",
    bgHover: "hover:bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-500",
  },
  {
    value: "adherente",
    label: "Adherente",
    initial: "A",
    bg: "bg-green-100",
    bgActive: "bg-green-500",
    bgHover: "hover:bg-green-50",
    text: "text-green-700",
    ring: "ring-green-500",
  },
  {
    value: "contratada",
    label: "Contratada / Empresa",
    initial: "C",
    bg: "bg-purple-100",
    bgActive: "bg-purple-500",
    bgHover: "hover:bg-purple-50",
    text: "text-purple-700",
    ring: "ring-purple-500",
  },
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
            <div className="p-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Roles / Firmantes
              </p>
              {ROLES.map((role) => {
                const count = fields.filter((f) => f.signer_role === role.value).length;
                const hasFields = count > 0;
                const isActive = activeRole === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => onRoleChange(role.value)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                      isActive
                        ? `${role.bgActive} text-white shadow-sm`
                        : `bg-muted/30 ${role.bgHover} border border-border`
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback
                        className={cn(
                          "text-[13px] font-bold",
                          isActive ? "bg-white/20 text-white" : `${role.bg} ${role.text}`
                        )}
                      >
                        {role.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[12px] font-medium truncate", isActive && "text-white")}>
                        {role.label}
                      </p>
                      <p className={cn("text-[10px]", isActive ? "text-white/70" : "text-muted-foreground")}>
                        {count} campo{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {hasFields && (
                      <div className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                        isActive ? "bg-white/20" : role.bg
                      )}>
                        <Check className={cn("h-3 w-3", isActive ? "text-white" : role.text)} />
                      </div>
                    )}
                  </button>
                );
              })}
              <p className="text-[10px] text-muted-foreground pt-3">
                Seleccioná un rol y luego andá a la pestaña <strong>Campos</strong> para agregar widgets al canvas.
              </p>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Campos ── */}
        <TabsContent value="fields" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              {/* Active role badge */}
              {(() => {
                const r = ROLES.find((r) => r.value === activeRole)!;
                return (
                  <div className={cn("flex items-center gap-2 rounded-md px-2.5 py-1.5 mb-3", r.bg)}>
                    <div className={cn("h-2.5 w-2.5 rounded-full", r.bgActive)} />
                    <span className={cn("text-[11px] font-semibold", r.text)}>
                      {r.label}
                    </span>
                  </div>
                );
              })()}
              <FieldOverlay
                templateId={templateId}
                placementActive={placementActive}
                onTogglePlacement={onTogglePlacement}
                activeFieldType={activeFieldType}
                activeSignerRole={activeRole}
                onFieldTypeChange={onFieldTypeChange}
                onSignerRoleChange={onRoleChange}
              />
            </div>
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
