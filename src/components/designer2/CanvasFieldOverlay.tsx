import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useTemplateFields, useCreateTemplateField, useUpdateTemplateField, useDeleteTemplateField } from "@/hooks/useTemplateFields";
import type { TemplateField, FieldType, SignerRole } from "@/types/templateDesigner";
import { PenTool, Calendar, Type, CheckSquare, User, CreditCard, Mail, Hash } from "lucide-react";

/* ───────── types ───────── */

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface CanvasFieldOverlayProps {
  templateId: string;
  activeFieldType: FieldType;
  activeSignerRole: SignerRole;
  placementActive: boolean;
  currentPage: number;
  onFieldSelect?: (fieldId: string | null) => void;
}

/* ───────── constants ───────── */

const ROLE_COLORS: Record<SignerRole, string> = {
  titular: "rgba(37,99,235,0.18)",
  adherente: "rgba(22,163,74,0.18)",
  contratada: "rgba(147,51,234,0.18)",
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

const HANDLE_SIZE = 8;

const HANDLE_POSITIONS: Record<ResizeHandle, { cursor: string; style: React.CSSProperties }> = {
  nw: { cursor: "nwse-resize", style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 } },
  n:  { cursor: "ns-resize",   style: { top: -HANDLE_SIZE / 2, left: "50%", transform: "translateX(-50%)" } },
  ne: { cursor: "nesw-resize", style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 } },
  e:  { cursor: "ew-resize",   style: { top: "50%", right: -HANDLE_SIZE / 2, transform: "translateY(-50%)" } },
  se: { cursor: "nwse-resize", style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 } },
  s:  { cursor: "ns-resize",   style: { bottom: -HANDLE_SIZE / 2, left: "50%", transform: "translateX(-50%)" } },
  sw: { cursor: "nesw-resize", style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 } },
  w:  { cursor: "ew-resize",   style: { top: "50%", left: -HANDLE_SIZE / 2, transform: "translateY(-50%)" } },
};

const MIN_W = 0.03;
const MIN_H = 0.02;

/* ───────── helpers ───────── */

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function applyResize(
  handle: ResizeHandle,
  ox: number, oy: number, ow: number, oh: number,
  dx: number, dy: number
): { x: number; y: number; w: number; h: number } {
  let x = ox, y = oy, w = ow, h = oh;

  if (handle.includes("e")) { w = clamp(ow + dx, MIN_W, 1 - ox); }
  if (handle.includes("w")) { const nw = clamp(ow - dx, MIN_W, ox + ow); x = ox + ow - nw; w = nw; }
  if (handle.includes("s")) { h = clamp(oh + dy, MIN_H, 1 - oy); }
  if (handle.includes("n")) { const nh = clamp(oh - dy, MIN_H, oy + oh); y = oy + oh - nh; h = nh; }

  return { x, y, w, h };
}

/* ───────── component ───────── */

export const CanvasFieldOverlay: React.FC<CanvasFieldOverlayProps> = ({
  templateId,
  activeFieldType,
  activeSignerRole,
  placementActive,
  currentPage,
  onFieldSelect,
}) => {
  const { data: fields = [] } = useTemplateFields(templateId);
  const createField = useCreateTemplateField();
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();

  const overlayRef = useRef<HTMLDivElement>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [interactionState, setInteractionState] = useState<{
    type: "drag" | "resize";
    fieldId: string;
    handle?: ResizeHandle;
  } | null>(null);
  const startRef = useRef({ mx: 0, my: 0, ox: 0, oy: 0, ow: 0, oh: 0 });
  const [livePos, setLivePos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Filter fields for current page, page-level only
  const pageFields = useMemo(
    () => fields.filter((f) => !f.block_id && f.page === currentPage),
    [fields, currentPage]
  );

  /* ─── Select / deselect ─── */
  const selectField = useCallback((id: string | null) => {
    setSelectedFieldId(id);
    onFieldSelect?.(id);
  }, [onFieldSelect]);

  /* ─── Click to place ─── */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (interactionState) return;
      // If clicking on empty area, deselect
      if ((e.target as HTMLElement) === overlayRef.current) {
        if (!placementActive) {
          selectField(null);
          return;
        }
      }
      if (!placementActive) return;

      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const defaults = FIELD_DEFAULT_SIZE[activeFieldType] || { w: 0.18, h: 0.04 };

      const fx = clamp(nx - defaults.w / 2, 0, 1 - defaults.w);
      const fy = clamp(ny - defaults.h / 2, 0, 1 - defaults.h);

      createField.mutate({
        template_id: templateId,
        block_id: null,
        signer_role: activeSignerRole,
        field_type: activeFieldType,
        page: currentPage,
        x: fx, y: fy, w: defaults.w, h: defaults.h,
        required: true,
        label: FIELD_LABELS[activeFieldType] || activeFieldType,
        meta: {
          relativeTo: "page",
          normalized: { x: fx, y: fy, w: defaults.w, h: defaults.h },
          appearance: {
            placeholderText: FIELD_LABELS[activeFieldType] || activeFieldType,
            borderStyle: "dashed",
            color: ROLE_BORDER[activeSignerRole],
          },
        } as any,
      });
    },
    [placementActive, interactionState, activeFieldType, activeSignerRole, templateId, currentPage, createField, selectField]
  );

  /* ─── Drag start ─── */
  const handleFieldMouseDown = useCallback((e: React.MouseEvent, field: TemplateField) => {
    e.stopPropagation();
    e.preventDefault();
    selectField(field.id);
    setInteractionState({ type: "drag", fieldId: field.id });
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    startRef.current = { mx: e.clientX, my: e.clientY, ox: field.x, oy: field.y, ow: field.w, oh: field.h };
    setLivePos({ x: field.x, y: field.y, w: field.w, h: field.h });
  }, [selectField]);

  /* ─── Resize start ─── */
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, field: TemplateField, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    selectField(field.id);
    setInteractionState({ type: "resize", fieldId: field.id, handle });
    startRef.current = { mx: e.clientX, my: e.clientY, ox: field.x, oy: field.y, ow: field.w, oh: field.h };
    setLivePos({ x: field.x, y: field.y, w: field.w, h: field.h });
  }, [selectField]);

  /* ─── Mouse move / up ─── */
  useEffect(() => {
    if (!interactionState) return;

    const handleMove = (e: MouseEvent) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (e.clientX - startRef.current.mx) / rect.width;
      const dy = (e.clientY - startRef.current.my) / rect.height;
      const s = startRef.current;

      if (interactionState.type === "drag") {
        const nx = clamp(s.ox + dx, 0, 1 - s.ow);
        const ny = clamp(s.oy + dy, 0, 1 - s.oh);
        setLivePos({ x: nx, y: ny, w: s.ow, h: s.oh });
      } else if (interactionState.type === "resize" && interactionState.handle) {
        setLivePos(applyResize(interactionState.handle, s.ox, s.oy, s.ow, s.oh, dx, dy));
      }
    };

    const handleUp = () => {
      if (livePos && interactionState.fieldId) {
        const field = pageFields.find((f) => f.id === interactionState.fieldId);
        updateField.mutate({
          id: interactionState.fieldId,
          x: livePos.x,
          y: livePos.y,
          w: livePos.w,
          h: livePos.h,
          meta: {
            ...(field?.meta as any),
            normalized: { x: livePos.x, y: livePos.y, w: livePos.w, h: livePos.h },
          },
        });
      }
      setInteractionState(null);
      setLivePos(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [interactionState, livePos, pageFields, updateField]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedFieldId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete if user is typing in an input
        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
        deleteField.mutate({ id: selectedFieldId, templateId });
        selectField(null);
      }
      if (e.key === "Escape") {
        selectField(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedFieldId, templateId, deleteField, selectField]);

  /* ─── Render ─── */
  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 z-20 ${placementActive ? "cursor-crosshair" : "pointer-events-none"}`}
      onClick={handleClick}
    >
      {pageFields.map((field) => {
        const Icon = FIELD_ICONS[field.field_type] || PenTool;
        const isSelected = selectedFieldId === field.id;
        const isInteracting = interactionState?.fieldId === field.id;
        const borderColor = ROLE_BORDER[field.signer_role];
        const bgColor = ROLE_COLORS[field.signer_role];

        // Use live position during interaction, otherwise DB values
        const pos = isInteracting && livePos
          ? livePos
          : { x: field.x, y: field.y, w: field.w, h: field.h };

        return (
          <div
            key={field.id}
            data-field-id={field.id}
            className={`absolute flex items-center justify-center select-none group pointer-events-auto transition-shadow ${
              isSelected ? "shadow-lg" : ""
            }`}
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              width: `${pos.w * 100}%`,
              height: `${pos.h * 100}%`,
              backgroundColor: bgColor,
              borderColor,
              borderWidth: isSelected ? 2 : 1.5,
              borderStyle: isSelected ? "solid" : "dashed",
              borderRadius: 4,
              cursor: "move",
              zIndex: isSelected ? 30 : 25,
            }}
            onMouseDown={(e) => handleFieldMouseDown(e, field)}
            onClick={(e) => {
              e.stopPropagation();
              selectField(field.id);
            }}
          >
            {/* Content */}
            <Icon className="h-3 w-3 shrink-0" style={{ color: borderColor }} />
            <span
              className="text-[8px] font-medium ml-0.5 truncate"
              style={{ color: borderColor }}
            >
              {field.label || field.field_type} — {field.signer_role}
            </span>

            {/* Delete button */}
            <button
              className="absolute -top-2.5 -right-2.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] leading-none hidden group-hover:flex items-center justify-center shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                deleteField.mutate({ id: field.id, templateId });
                if (selectedFieldId === field.id) selectField(null);
              }}
            >
              ×
            </button>

            {/* 8 resize handles — only when selected */}
            {isSelected && (Object.entries(HANDLE_POSITIONS) as [ResizeHandle, typeof HANDLE_POSITIONS[ResizeHandle]][]).map(
              ([handle, { cursor, style }]) => (
                <div
                  key={handle}
                  className="absolute z-30 rounded-sm"
                  style={{
                    width: HANDLE_SIZE,
                    height: HANDLE_SIZE,
                    cursor,
                    backgroundColor: borderColor,
                    border: "1px solid hsl(var(--background))",
                    ...style,
                  }}
                  onMouseDown={(e) => handleResizeMouseDown(e, field, handle)}
                />
              )
            )}

            {/* Tooltip during interaction */}
            {isInteracting && livePos && (
              <div
                className="absolute -top-7 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap shadow-md pointer-events-none"
                style={{
                  backgroundColor: borderColor,
                  color: "#fff",
                }}
              >
                {interactionState.type === "drag"
                  ? `x: ${(livePos.x * 100).toFixed(1)}% y: ${(livePos.y * 100).toFixed(1)}%`
                  : `w: ${(livePos.w * 100).toFixed(1)}% h: ${(livePos.h * 100).toFixed(1)}%`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
