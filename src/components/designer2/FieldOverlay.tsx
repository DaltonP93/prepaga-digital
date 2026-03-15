import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, PenTool, Calendar, Type, CheckSquare, User, CreditCard, Mail, Hash, MousePointer } from "lucide-react";
import { useTemplateFields, useCreateTemplateField, useDeleteTemplateField } from "@/hooks/useTemplateFields";
import type { FieldType, SignerRole } from "@/types/templateDesigner";

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

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: "signature", label: "Firma", icon: PenTool },
  { value: "initials", label: "Iniciales", icon: Hash },
  { value: "name", label: "Nombre", icon: User },
  { value: "dni", label: "C.I./DNI", icon: CreditCard },
  { value: "date", label: "Fecha", icon: Calendar },
  { value: "text", label: "Texto", icon: Type },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "email", label: "Email", icon: Mail },
];

const SIGNER_ROLES: { value: SignerRole; label: string; color: string }[] = [
  { value: "titular", label: "Titular / Contratante", color: "bg-blue-500" },
  { value: "adherente", label: "Adherente", color: "bg-green-500" },
  { value: "contratada", label: "Contratada / Empresa", color: "bg-purple-500" },
];

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
  const createField = useCreateTemplateField();
  const deleteField = useDeleteTemplateField();

  const allFields = fields || [];

  // Group fields by signer role
  const fieldsByRole = SIGNER_ROLES.map((role) => ({
    ...role,
    fields: allFields.filter((f) => f.signer_role === role.value),
  }));

  const handleAddField = () => {
    createField.mutate({
      template_id: templateId,
      block_id: selectedBlockId || null,
      signer_role: activeSignerRole,
      field_type: activeFieldType,
      page: 1,
      x: 0.3 + Math.random() * 0.2,
      y: 0.7 + Math.random() * 0.1,
      w: 0.18,
      h: 0.05,
      required: true,
      label: FIELD_TYPES.find((f) => f.value === activeFieldType)?.label || "",
      meta: {
        relativeTo: selectedBlockId ? "block" : "page",
        blockId: selectedBlockId || undefined,
        normalized: { x: 0.4, y: 0.75, w: 0.18, h: 0.05 },
        appearance: {
          placeholderText: FIELD_TYPES.find((f) => f.value === activeFieldType)?.label || "",
          borderStyle: "dashed",
          color: "#2563eb",
        },
      } as any,
    });
  };

  const handleDeleteField = (fieldId: string) => {
    deleteField.mutate({ id: fieldId, templateId });
  };

  const getRoleColor = (role: string) =>
    SIGNER_ROLES.find((r) => r.value === role)?.color || "bg-muted";

  return (
    <div className="space-y-3 p-1">
      {/* Placement mode toggle */}
      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <MousePointer className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-[11px] font-medium">Colocar en canvas</Label>
        </div>
        <Switch
          checked={placementActive}
          onCheckedChange={(v) => onTogglePlacement?.(v)}
        />
      </div>

      {/* Field type + role selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Tipo</span>
          <Select value={activeFieldType} onValueChange={(v) => onFieldTypeChange?.(v as FieldType)}>
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>
                  <div className="flex items-center gap-2">
                    <ft.icon className="h-3 w-3" />
                    {ft.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Firmante</span>
          <Select value={activeSignerRole} onValueChange={(v) => onSignerRoleChange?.(v as SignerRole)}>
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIGNER_ROLES.map((sr) => (
                <SelectItem key={sr.value} value={sr.value}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${sr.color}`} />
                    {sr.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full gap-1 h-7 text-[11px]"
        onClick={handleAddField}
        disabled={createField.isPending}
      >
        <Plus className="h-3 w-3" />
        Agregar campo
      </Button>

      <Separator />

      {/* Fields grouped by signer role */}
      <ScrollArea className="max-h-[280px]">
        <div className="space-y-3">
          {fieldsByRole.map((group) => (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${group.color}`} />
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
