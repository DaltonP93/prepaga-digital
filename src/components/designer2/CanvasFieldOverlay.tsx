import React, { useRef, useState, useCallback, useEffect } from "react";
import { useTemplateFields, useCreateTemplateField, useUpdateTemplateField, useDeleteTemplateField } from "@/hooks/useTemplateFields";
import type { TemplateField, FieldType, SignerRole } from "@/types/templateDesigner";
import { PenTool, Calendar, Type, CheckSquare, User, CreditCard, Mail, Hash } from "lucide-react";

interface CanvasFieldOverlayProps {
  templateId: string;
  activeFieldType: FieldType;
  activeSignerRole: SignerRole;
  /** When true, clicking on the canvas creates a new field */
  placementActive: boolean;
}

const ROLE_COLORS: Record<SignerRole, string> = {
  titular: "rgba(37,99,235,0.25)",
  adherente: "rgba(22,163,74,0.25)",
  contratada: "rgba(147,51,234,0.25)",
};

const ROLE_BORDER: Record<SignerRole, string> = {
  titular: "#2563eb",
  adherente: "#16a34a",
  contratada: "#9333ea",
};

const FIELD_ICONS: Record<string, React.ElementType> = {
  signature: PenTool,
  initials: Hash,
  date: Calendar,
  text: Type,
  checkbox: CheckSquare,
  name: User,
  dni: CreditCard,
  email: Mail,
};

const FIELD_DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  signature: { w: 0.2, h: 0.06 },
  initials: { w: 0.08, h: 0.04 },
  date: { w: 0.15, h: 0.03 },
  text: { w: 0.2, h: 0.03 },
  checkbox: { w: 0.03, h: 0.03 },
  name: { w: 0.2, h: 0.03 },
  dni: { w: 0.15, h: 0.03 },
  email: { w: 0.2, h: 0.03 },
};

const FIELD_LABELS: Record<string, string> = {
  signature: "Firma",
  initials: "Iniciales",
  date: "Fecha",
  text: "Texto",
  checkbox: "Check",
  name: "Nombre",
  dni: "C.I.",
  email: "Email",
};

export const CanvasFieldOverlay: React.FC<CanvasFieldOverlayProps> = ({
  templateId,
  activeFieldType,
  activeSignerRole,
  placementActive,
}) => {
  const { data: fields = [] } = useTemplateFields(templateId);
  const createField = useCreateTemplateField();
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();

  const overlayRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0, ow: 0, oh: 0 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Only show page-level fields (block_id is null)
  const pageFields = fields.filter((f) => !f.block_id);

  /* ─── Click to place ─── */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementActive || draggingId || resizingId) return;
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;

      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const defaults = FIELD_DEFAULT_SIZE[activeFieldType] || { w: 0.18, h: 0.04 };

      createField.mutate({
        template_id: templateId,
        block_id: null,
        signer_role: activeSignerRole,
        field_type: activeFieldType,
        page: 1,
        x: Math.max(0, Math.min(nx - defaults.w / 2, 1 - defaults.w)),
        y: Math.max(0, Math.min(ny - defaults.h / 2, 1 - defaults.h)),
        w: defaults.w,
        h: defaults.h,
        required: true,
        label: FIELD_LABELS[activeFieldType] || activeFieldType,
        meta: {
          relativeTo: "page",
          normalized: {
            x: Math.max(0, Math.min(nx - defaults.w / 2, 1 - defaults.w)),
            y: Math.max(0, Math.min(ny - defaults.h / 2, 1 - defaults.h)),
            w: defaults.w,
            h: defaults.h,
          },
          appearance: {
            placeholderText: FIELD_LABELS[activeFieldType] || activeFieldType,
            borderStyle: "dashed",
            color: ROLE_BORDER[activeSignerRole],
          },
        } as any,
      });
    },
    [placementActive, draggingId, resizingId, activeFieldType, activeSignerRole, templateId, createField]
  );

  /* ─── Drag ─── */
  const handleFieldMouseDown = useCallback((e: React.MouseEvent, field: TemplateField) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingId(field.id);
    setSelectedFieldId(field.id);
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: field.x, oy: field.y, ow: field.w, oh: field.h };
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, field: TemplateField) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingId(field.id);
    setSelectedFieldId(field.id);
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: field.x, oy: field.y, ow: field.w, oh: field.h };
  }, []);

  useEffect(() => {
    if (!draggingId && !resizingId) return;

    const handleMove = (e: MouseEvent) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (e.clientX - dragStart.current.mx) / rect.width;
      const dy = (e.clientY - dragStart.current.my) / rect.height;

      const el = overlayRef.current?.querySelector(`[data-field-id="${draggingId || resizingId}"]`) as HTMLElement;
      if (!el) return;

      if (draggingId) {
        const nx = Math.max(0, Math.min(1 - dragStart.current.ow, dragStart.current.ox + dx));
        const ny = Math.max(0, Math.min(1 - dragStart.current.oh, dragStart.current.oy + dy));
        el.style.left = `${nx * 100}%`;
        el.style.top = `${ny * 100}%`;
      }
      if (resizingId) {
        const nw = Math.max(0.03, Math.min(1 - dragStart.current.ox, dragStart.current.ow + dx));
        const nh = Math.max(0.02, Math.min(1 - dragStart.current.oy, dragStart.current.oh + dy));
        el.style.width = `${nw * 100}%`;
        el.style.height = `${nh * 100}%`;
      }
    };

    const handleUp = (e: MouseEvent) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (e.clientX - dragStart.current.mx) / rect.width;
      const dy = (e.clientY - dragStart.current.my) / rect.height;
      const fieldId = draggingId || resizingId;
      if (!fieldId) return;

      const updates: any = { id: fieldId };

      if (draggingId) {
        updates.x = Math.max(0, Math.min(1 - dragStart.current.ow, dragStart.current.ox + dx));
        updates.y = Math.max(0, Math.min(1 - dragStart.current.oh, dragStart.current.oy + dy));
      }
      if (resizingId) {
        updates.w = Math.max(0.03, Math.min(1 - dragStart.current.ox, dragStart.current.ow + dx));
        updates.h = Math.max(0.02, Math.min(1 - dragStart.current.oy, dragStart.current.oh + dy));
      }

      const field = pageFields.find((f) => f.id === fieldId);
      if (field) {
        updates.meta = {
          ...(field.meta as any),
          normalized: {
            x: updates.x ?? field.x,
            y: updates.y ?? field.y,
            w: updates.w ?? field.w,
            h: updates.h ?? field.h,
          },
        };
      }

      updateField.mutate(updates);
      setDraggingId(null);
      setResizingId(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingId, resizingId, pageFields, updateField]);

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 z-20 ${placementActive ? "cursor-crosshair" : "pointer-events-none"}`}
      onClick={handleClick}
    >
      {pageFields.map((field) => {
        const Icon = FIELD_ICONS[field.field_type] || PenTool;
        const isSelected = selectedFieldId === field.id;
        const borderColor = ROLE_BORDER[field.signer_role];
        const bgColor = ROLE_COLORS[field.signer_role];

        return (
          <div
            key={field.id}
            data-field-id={field.id}
            className={`absolute flex items-center justify-center select-none group pointer-events-auto ${
              isSelected ? "ring-2 ring-offset-1" : ""
            }`}
            style={{
              left: `${field.x * 100}%`,
              top: `${field.y * 100}%`,
              width: `${field.w * 100}%`,
              height: `${field.h * 100}%`,
              backgroundColor: bgColor,
              borderColor,
              borderWidth: 2,
              borderStyle: "dashed",
              borderRadius: 3,
              cursor: "move",
              // @ts-expect-error ring color via CSS variable
              "--tw-ring-color": borderColor,
            }}
            onMouseDown={(e) => handleFieldMouseDown(e, field)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFieldId(field.id);
            }}
          >
            <Icon className="h-3 w-3 shrink-0" style={{ color: borderColor }} />
            <span
              className="text-[8px] font-medium ml-0.5 truncate"
              style={{ color: borderColor }}
            >
              {field.label || field.field_type} — {field.signer_role}
            </span>

            {/* Delete button */}
            <button
              className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] leading-none hidden group-hover:flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                deleteField.mutate({ id: field.id, templateId });
              }}
            >
              ×
            </button>

            {/* Resize handle */}
            {isSelected && (
              <div
                className="absolute -bottom-1 -right-1 w-3 h-3 rounded-sm cursor-nwse-resize z-30"
                style={{ backgroundColor: borderColor }}
                onMouseDown={(e) => handleResizeMouseDown(e, field)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
