import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Layers, Settings2, History, Check, Trash2, MousePointerClick, FilePlus2 } from "lucide-react";
import { FieldOverlay } from "@/components/designer2/FieldOverlay";
import { BlockPropertyPanel } from "@/components/designer2/BlockPropertyPanel";
import { VersionPanel } from "@/components/designer2/VersionPanel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  selectedField: TemplateField | null;
  onUpdateField: (updates: Partial<TemplateField>) => void;
  onDeleteField: (id: string) => void;
  onInsertDocument?: () => void;
  onRequestPickImage?: () => void;
}

const ROLES: {
  value: SignerRole; label: string; initial: string;
  bg: string; bgActive: string; bgHover: string; text: string;
}[] = [
  { value: "titular", label: "Titular / Contratante", initial: "T", bg: "bg-blue-100", bgActive: "bg-blue-500", bgHover: "hover:bg-blue-50", text: "text-blue-700" },
  { value: "adherente", label: "Adherente", initial: "A", bg: "bg-green-100", bgActive: "bg-green-500", bgHover: "hover:bg-green-50", text: "text-green-700" },
  { value: "contratada", label: "Contratada / Empresa", initial: "C", bg: "bg-purple-100", bgActive: "bg-purple-500", bgHover: "hover:bg-purple-50", text: "text-purple-700" },
];

const FIELD_TYPE_LABELS: Record<string, string> = {
  signature: "Firma", initials: "Iniciales", date: "Fecha", text: "Texto",
  checkbox: "Checkbox", name: "Nombre", dni: "C.I.", email: "Email",
  stamp: "Sello", dropdown: "Desplegable", radio: "Radio",
};

/* ───── Field Property Panel ───── */
const FieldPropertyPanel: React.FC<{
  field: TemplateField;
  onUpdate: (updates: Partial<TemplateField>) => void;
  onDelete: (id: string) => void;
}> = ({ field, onUpdate, onDelete }) => {
  const role = ROLES.find((r) => r.value === field.signer_role);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-full", role?.bgActive || "bg-muted")} />
          <span className="text-[12px] font-semibold">{FIELD_TYPE_LABELS[field.field_type] || field.field_type}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{role?.label}</span>
        </div>

        <Separator />

        {/* Label */}
        <div className="space-y-1">
          <Label className="text-[11px]">Etiqueta</Label>
          <Input
            className="h-7 text-[12px]"
            value={field.label || ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
          />
        </div>

        {/* Required */}
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Obligatorio</Label>
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => onUpdate({ required: checked })}
          />
        </div>

        {/* Signer Role */}
        <div className="space-y-1">
          <Label className="text-[11px]">Rol firmante</Label>
          <Select value={field.signer_role} onValueChange={(v) => onUpdate({ signer_role: v as SignerRole })}>
            <SelectTrigger className="h-7 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Coordinates (read-only info) */}
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Posición</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className="text-[9px] text-muted-foreground">X</span>
              <span className="text-[11px] font-mono block">{(field.x * 100).toFixed(1)}%</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-muted-foreground">Y</span>
              <span className="text-[11px] font-mono block">{(field.y * 100).toFixed(1)}%</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-muted-foreground">Ancho</span>
              <span className="text-[11px] font-mono block">{(field.w * 100).toFixed(1)}%</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-muted-foreground">Alto</span>
              <span className="text-[11px] font-mono block">{(field.h * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <Separator />

        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-1 text-[11px] h-7"
          onClick={() => onDelete(field.id)}
        >
          <Trash2 className="h-3 w-3" />
          Eliminar campo
        </Button>
      </div>
    </ScrollArea>
  );
};

/* ───── Main Panel ───── */
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
  selectedField,
  onUpdateField,
  onDeleteField,
  onInsertDocument,
  onRequestPickImage,
}) => {
  return (
    <aside className="flex flex-col border-l bg-background h-full">
      <Tabs defaultValue="roles" className="flex flex-col h-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 px-1 h-10 shrink-0">
          <TabsTrigger value="roles" className="gap-1 text-[11px] px-2">
            <Users className="h-3 w-3" /> Firmantes
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-1 text-[11px] px-2">
            <Layers className="h-3 w-3" /> Campos
          </TabsTrigger>
          <TabsTrigger value="props" className="gap-1 text-[11px] px-2">
            <Settings2 className="h-3 w-3" /> Props
          </TabsTrigger>
          <TabsTrigger value="versions" className="gap-1 text-[11px] px-2">
            <History className="h-3 w-3" /> Vers.
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
                      <AvatarFallback className={cn("text-[13px] font-bold", isActive ? "bg-white/20 text-white" : `${role.bg} ${role.text}`)}>
                        {role.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[12px] font-medium truncate", isActive && "text-white")}>{role.label}</p>
                      <p className={cn("text-[10px]", isActive ? "text-white/70" : "text-muted-foreground")}>
                        {count} campo{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {hasFields && (
                      <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0", isActive ? "bg-white/20" : role.bg)}>
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
              {(() => {
                const r = ROLES.find((r) => r.value === activeRole)!;
                return (
                  <div className={cn("flex items-center gap-2 rounded-md px-2.5 py-1.5 mb-3", r.bg)}>
                    <div className={cn("h-2.5 w-2.5 rounded-full", r.bgActive)} />
                    <span className={cn("text-[11px] font-semibold", r.text)}>{r.label}</span>
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

              {onInsertDocument && (
                <>
                  <Separator className="my-3" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-[11px] h-8"
                    onClick={onInsertDocument}
                  >
                    <FilePlus2 className="h-3.5 w-3.5" />
                    Insertar Documento (PDF/DOCX)
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Propiedades ── */}
        <TabsContent value="props" className="flex-1 m-0 overflow-hidden">
          {selectedField ? (
            <FieldPropertyPanel
              field={selectedField}
              onUpdate={onUpdateField}
              onDelete={onDeleteField}
            />
          ) : selectedBlock ? (
            <BlockPropertyPanel
              block={selectedBlock}
              onUpdate={onUpdateBlock}
              onAddBlock={onAddBlock}
              templateId={templateId}
              onRequestPickImage={onRequestPickImage}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
              <MousePointerClick className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-[12px] text-muted-foreground">
                Seleccioná un campo o bloque en el canvas para ver sus propiedades.
              </p>
            </div>
          )}
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
