import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, PenTool, Calendar, Type, CheckSquare, User, CreditCard, Mail, Hash } from "lucide-react";
import { useTemplateFields, useCreateTemplateField, useDeleteTemplateField } from "@/hooks/useTemplateFields";
import type { TemplateField, FieldType, SignerRole } from "@/types/templateDesigner";

interface FieldOverlayProps {
  templateId: string;
  selectedBlockId?: string;
}

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: "signature", label: "Firma", icon: PenTool },
  { value: "initials", label: "Iniciales", icon: Hash },
  { value: "date", label: "Fecha", icon: Calendar },
  { value: "text", label: "Texto", icon: Type },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "name", label: "Nombre", icon: User },
  { value: "dni", label: "C.I./DNI", icon: CreditCard },
  { value: "email", label: "Email", icon: Mail },
];

const SIGNER_ROLES: { value: SignerRole; label: string; color: string }[] = [
  { value: "titular", label: "Titular", color: "bg-blue-500" },
  { value: "adherente", label: "Adherente", color: "bg-green-500" },
  { value: "contratada", label: "Contratada", color: "bg-purple-500" },
];

export const FieldOverlay: React.FC<FieldOverlayProps> = ({ templateId, selectedBlockId }) => {
  const { data: fields } = useTemplateFields(templateId);
  const createField = useCreateTemplateField();
  const deleteField = useDeleteTemplateField();

  const [newFieldType, setNewFieldType] = useState<FieldType>("signature");
  const [newSignerRole, setNewSignerRole] = useState<SignerRole>("titular");

  const blockFields = fields?.filter((f) => f.block_id === selectedBlockId) || [];
  const allFields = fields || [];

  const handleAddField = () => {
    createField.mutate({
      template_id: templateId,
      block_id: selectedBlockId || null,
      signer_role: newSignerRole,
      field_type: newFieldType,
      page: 1,
      x: 0.5,
      y: 0.5,
      w: 0.18,
      h: 0.05,
      required: true,
      label: null,
      meta: {
        relativeTo: selectedBlockId ? "block" : "page",
        blockId: selectedBlockId || undefined,
        normalized: { x: 0.5, y: 0.5, w: 0.18, h: 0.05 },
        appearance: {
          placeholderText: FIELD_TYPES.find((f) => f.value === newFieldType)?.label || "",
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Campos Interactivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add field */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Tipo</span>
              <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FieldType)}>
                <SelectTrigger className="h-8 text-xs">
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
              <Select value={newSignerRole} onValueChange={(v) => setNewSignerRole(v as SignerRole)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNER_ROLES.map((sr) => (
                    <SelectItem key={sr.value} value={sr.value}>
                      {sr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full gap-1"
            onClick={handleAddField}
            disabled={createField.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar campo
          </Button>
        </div>

        <Separator />

        {/* Fields list */}
        <ScrollArea className="max-h-48">
          <div className="space-y-1.5">
            {(selectedBlockId ? blockFields : allFields).map((field) => {
              const FieldIcon = FIELD_TYPES.find((f) => f.value === field.field_type)?.icon || Type;
              return (
                <div
                  key={field.id}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
                >
                  <div className={`h-2 w-2 rounded-full ${getRoleColor(field.signer_role)}`} />
                  <FieldIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate capitalize">
                    {field.field_type} — {field.signer_role}
                  </span>
                  {field.required && (
                    <Badge variant="outline" className="text-[9px] px-1">Req</Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
            {(selectedBlockId ? blockFields : allFields).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Sin campos aún
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
