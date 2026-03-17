import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Trash2, PenTool, Calendar, Type, CheckSquare, User, CreditCard,
  Mail, Hash, MousePointer, Stamp, ListFilter, Circle, GripVertical, Pen, Building2, AlignLeft,
} from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { useTemplateFields, useDeleteTemplateField } from "@/hooks/useTemplateFields";
import type { FieldType, SignerRole } from "@/types/templateDesigner";
import type { WidgetDragData } from "@/lib/widgetUtils";
import { cn } from "@/lib/utils";

interface FieldOverlayProps {
  templateId: string;
  selectedBlockId?: string;
  onTogglePlacement?: (active: boolean) => void;
  placementActive?: boolean;
  activeFieldType?: FieldType;
  activeSignerRole?: SignerRole;
  onFieldTypeChange?: (type: FieldType) => void;
  onSignerRoleChange?: (role: SignerRole) => void;
}

/* ─── Widget sections matching OpenSign layout ─── */
const SECTION_FIRMA: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: "signature", label: "Firma", icon: PenTool },
  { value: "initials", label: "Iniciales", icon: Pen },
];

const SECTION_DATOS: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: "date", label: "Fecha", icon: Calendar },
  { value: "name", label: "Nombre", icon: User },
  { value: "email", label: "Email", icon: Mail },
  { value: "dni", label: "CI / DNI", icon: CreditCard },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "text", label: "Texto libre", icon: AlignLeft },
  { value: "dropdown", label: "Desplegable", icon: ListFilter },
  { value: "radio", label: "Radio", icon: Circle },
];

const SECTION_EMPRESA: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: "stamp", label: "Sello / Stamp", icon: Building2 },
];

export const FIELD_TYPES = [...SECTION_FIRMA, ...SECTION_DATOS, ...SECTION_EMPRESA];

const SIGNER_ROLES: { value: SignerRole; label: string; color: string }[] = [
  { value: "titular", label: "Titular", color: "bg-blue-500" },
  { value: "adherente", label: "Adherente", color: "bg-green-500" },
  { value: "contratada", label: "Contratada", color: "bg-amber-500" },
];

export const ROLE_COLORS: Record<SignerRole, string> = {
  titular: "#3b82f6",
  adherente: "#10b981",
  contratada: "#f59e0b",
};

/* ─── Draggable widget button (OpenSign style) ─── */
const DraggableWidget: React.FC<{
  fieldType: FieldType;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}> = ({ fieldType, label, icon: Icon, isActive, onClick, fullWidth }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `widget-${fieldType}`,
    data: { type: "widget", fieldType } satisfies WidgetDragData,
  });

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-2 transition-all text-[11px] font-medium touch-none cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isActive
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:border-border",
        fullWidth ? "col-span-2 flex-row justify-start gap-2 px-3" : "flex-col items-center gap-1.5 p-2"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
};

export const FieldOverlay: React.FC<FieldOverlayProps> = ({
  templateId,
  selectedBlockId,
  onTogglePlacement,
  placementActive = false,
  activeFieldType = "signature",
  activeSignerRole = "titular",
  onFieldTypeChange,
  onSignerRoleChange,
}) => {
  const { data: fields } = useTemplateFields(templateId);
  const deleteField = useDeleteTemplateField();

  const allFields = fields || [];

  const handleDeleteField = (fieldId: string) => {
    deleteField.mutate({ id: fieldId, templateId });
  };

  const fieldsByRole = SIGNER_ROLES.map((role) => ({
    ...role,
    fields: allFields.filter((f) => f.signer_role === role.value),
  }));

  return (
    <div className="space-y-3">
      {/* Placement mode toggle */}
      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <MousePointer className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-[11px] font-medium">Click para colocar</Label>
        </div>
        <Switch
          checked={placementActive}
          onCheckedChange={(v) => onTogglePlacement?.(v)}
        />
      </div>

      <p className="text-[10px] text-muted-foreground">
        Arrastrá un widget al canvas o activá el modo click.
      </p>

      {/* ── Section: Firma ── */}
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Firma</p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {SECTION_FIRMA.map((ft) => (
          <DraggableWidget
            key={ft.value}
            fieldType={ft.value}
            label={ft.label}
            icon={ft.icon}
            isActive={activeFieldType === ft.value}
            onClick={() => onFieldTypeChange?.(ft.value)}
          />
        ))}
      </div>

      {/* ── Section: Datos del firmante ── */}
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Datos del firmante</p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {SECTION_DATOS.map((ft) => (
          <DraggableWidget
            key={ft.value}
            fieldType={ft.value}
            label={ft.label}
            icon={ft.icon}
            isActive={activeFieldType === ft.value}
            onClick={() => onFieldTypeChange?.(ft.value)}
          />
        ))}
      </div>

      {/* ── Section: Empresa ── */}
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Empresa</p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {SECTION_EMPRESA.map((ft) => (
          <DraggableWidget
            key={ft.value}
            fieldType={ft.value}
            label={ft.label}
            icon={ft.icon}
            isActive={activeFieldType === ft.value}
            onClick={() => onFieldTypeChange?.(ft.value)}
            fullWidth
          />
        ))}
      </div>

      <Separator />

      {/* Existing fields grouped by role */}
      <ScrollArea className="max-h-[260px]">
        <div className="space-y-3">
          {fieldsByRole.map((group) => (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn("h-2.5 w-2.5 rounded-full", group.color)} />
                <span className="text-[11px] font-semibold">{group.label}</span>
                <Badge variant="secondary" className="text-[9px] px-1 ml-auto">
                  {group.fields.length}
                </Badge>
              </div>
              {group.fields.length === 0 ? (
                <p className="text-[10px] text-muted-foreground pl-5 pb-1">Sin campos</p>
              ) : (
                <div className="space-y-1 pl-1">
                  {group.fields.map((field) => {
                    const FieldIcon = FIELD_TYPES.find((f) => f.value === field.field_type)?.icon || Type;
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]"
                      >
                        <FieldIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">
                          {field.label || field.field_type}
                        </span>
                        {field.required && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0">Req</Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive shrink-0"
                          onClick={() => handleDeleteField(field.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
