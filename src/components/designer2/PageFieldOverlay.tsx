import React, { useRef, useCallback, useState } from "react";
import { useTemplateFields, useCreateTemplateField, useUpdateTemplateField, useDeleteTemplateField } from "@/hooks/useTemplateFields";
import type { TemplateField, FieldType, SignerRole } from "@/types/templateDesigner";
import { PenTool, Calendar, Type, CheckSquare } from "lucide-react";

interface PageFieldOverlayProps {
  templateId: string;
  blockId: string;
  pageNumber: number;
  signerRole: SignerRole;
  fieldType: FieldType;
  containerWidth: number;
  containerHeight: number;
}

const ROLE_COLORS: Record<SignerRole, string> = {
  titular: "rgba(37,99,235,0.35)",
  adherente: "rgba(22,163,74,0.35)",
  contratada: "rgba(147,51,234,0.35)",
};

const ROLE_BORDER: Record<SignerRole, string> = {
  titular: "#2563eb",
  adherente: "#16a34a",
  contratada: "#9333ea",
};

const FIELD_ICONS: Record<string, React.ElementType> = {
  signature: PenTool,
  date: Calendar,
  text: Type,
  checkbox: CheckSquare,
};

export const PageFieldOverlay: React.FC<PageFieldOverlayProps> = ({
  templateId,
  blockId,
  pageNumber,
  signerRole,
  fieldType,
  containerWidth,
  containerHeight,
}) => {
  const { data: allFields = [] } = useTemplateFields(templateId);
  const createField = useCreateTemplateField();
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();

  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const fields = allFields.filter(
    (f) => f.block_id === blockId && (f.meta as any)?.sourcePageNumber === pageNumber
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const fw = 0.18;
      const fh = 0.05;

      createField.mutate({
        template_id: templateId,
        block_id: blockId,
        signer_role: signerRole,
        field_type: fieldType,
        page: pageNumber,
        x: Math.max(0, Math.min(nx - fw / 2, 1 - fw)),
        y: Math.max(0, Math.min(ny - fh / 2, 1 - fh)),
        w: fw,
        h: fh,
        required: true,
        label: null,
        meta: {
          relativeTo: "block",
          blockId,
          sourcePageNumber: pageNumber,
          normalized: {
            x: Math.max(0, Math.min(nx - fw / 2, 1 - fw)),
            y: Math.max(0, Math.min(ny - fh / 2, 1 - fh)),
            w: fw,
            h: fh,
          },
          appearance: {
            placeholderText: fieldType,
            borderStyle: "dashed",
            color: ROLE_BORDER[signerRole],
          },
        } as any,
      });
    },
    [templateId, blockId, signerRole, fieldType, pageNumber, dragging, createField]
  );

  const handleMouseDown = (e: React.MouseEvent, field: TemplateField) => {
    e.stopPropagation();
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(field.id);
    setDragOffset({
      x: e.clientX - rect.left - field.x * rect.width,
      y: e.clientY - rect.top - field.y * rect.height,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const field = fields.find((f) => f.id === dragging);
      if (!field) return;

      const nx = (e.clientX - rect.left - dragOffset.x) / rect.width;
      const ny = (e.clientY - rect.top - dragOffset.y) / rect.height;

      updateField.mutate({
        id: field.id,
        x: Math.max(0, Math.min(nx, 1 - field.w)),
        y: Math.max(0, Math.min(ny, 1 - field.h)),
        meta: {
          ...(field.meta as any),
          normalized: {
            ...(field.meta as any)?.normalized,
            x: Math.max(0, Math.min(nx, 1 - field.w)),
            y: Math.max(0, Math.min(ny, 1 - field.h)),
          },
        } as any,
      });
    },
    [dragging, dragOffset, fields, updateField]
  );

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 cursor-crosshair"
      style={{ width: containerWidth, height: containerHeight }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {fields.map((field) => {
        const Icon = FIELD_ICONS[field.field_type] || PenTool;
        return (
          <div
            key={field.id}
            className="absolute border-2 rounded-sm flex items-center justify-center cursor-move select-none group"
            style={{
              left: `${field.x * 100}%`,
              top: `${field.y * 100}%`,
              width: `${field.w * 100}%`,
              height: `${field.h * 100}%`,
              backgroundColor: ROLE_COLORS[field.signer_role],
              borderColor: ROLE_BORDER[field.signer_role],
              borderStyle: "dashed",
            }}
            onMouseDown={(e) => handleMouseDown(e, field)}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="h-3 w-3" style={{ color: ROLE_BORDER[field.signer_role] }} />
            <span
              className="text-[8px] font-medium ml-0.5 truncate"
              style={{ color: ROLE_BORDER[field.signer_role] }}
            >
              {field.signer_role}
            </span>
            <button
              className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] leading-none hidden group-hover:flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                deleteField.mutate({ id: field.id, templateId });
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};
