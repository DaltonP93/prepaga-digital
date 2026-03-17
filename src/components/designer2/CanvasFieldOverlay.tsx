import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useTemplateFields, useCreateTemplateField, useUpdateTemplateField, useDeleteTemplateField } from "@/hooks/useTemplateFields";
import { useToast } from "@/hooks/use-toast";
import type { TemplateField, FieldType, SignerRole } from "@/types/templateDesigner";
import { PenTool, Calendar, Type, CheckSquare, User, CreditCard, Mail, Hash, Stamp, ListFilter, Circle, Pen, Building2, AlignLeft } from "lucide-react";
import { FIELD_DEFAULT_SIZE, FIELD_LABELS, clamp, applyResize, type ResizeHandle } from "@/lib/widgetUtils";

/* ───────── types ───────── */

interface CanvasFieldOverlayProps {
  templateId: string;
  activeFieldType: FieldType;
  activeSignerRole: SignerRole;
  placementActive: boolean;
  currentPage: number;
  selectedFieldId?: string | null;
  onFieldSelect?: (fieldId: string | null) => void;
}

/* ───────── constants (OpenSign colors) ───────── */

const ROLE_COLORS: Record<SignerRole, string> = {
  titular: "rgba(59,130,246,0.12)",
  adherente: "rgba(16,185,129,0.12)",
  contratada: "rgba(245,158,11,0.12)",
};

const ROLE_BORDER: Record<SignerRole, string> = {
  titular: "#3b82f6",
  adherente: "#10b981",
  contratada: "#f59e0b",
};

const ROLE_RING: Record<SignerRole, string> = {
  titular: "rgba(59,130,246,0.35)",
  adherente: "rgba(16,185,129,0.35)",
  contratada: "rgba(245,158,11,0.35)",
};

const ROLE_LABELS: Record<SignerRole, string> = {
  titular: "Titular",
  adherente: "Adherente",
  contratada: "Contratada",
};

const FIELD_ICONS: Record<string, React.ElementType> = {
  signature: PenTool, initials: Pen, date: Calendar, text: AlignLeft,
  checkbox: CheckSquare, name: User, dni: CreditCard, email: Mail,
  stamp: Building2, dropdown: ListFilter, radio: Circle,
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

/* ───────── component ───────── */

export const CanvasFieldOverlay: React.FC<CanvasFieldOverlayProps> = ({
  templateId,
  activeFieldType,
  activeSignerRole,
  placementActive,
  currentPage,
  selectedFieldId: controlledSelectedId,
  onFieldSelect,
}) => {
  const { toast } = useToast();
  const { data: fields = [] } = useTemplateFields(templateId);
  const createField = useCreateTemplateField();
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();

  const overlayRef = useRef<HTMLDivElement>(null);

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const isControlled = controlledSelectedId !== undefined;
  const selectedFieldId = isControlled ? controlledSelectedId : internalSelectedId;

  const [interactionState, setInteractionState] = useState<{
    type: "drag" | "resize"; fieldId: string; handle?: ResizeHandle;
  } | null>(null);
  const startRef = useRef({ mx: 0, my: 0, ox: 0, oy: 0, ow: 0, oh: 0 });
  const [livePos, setLivePos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const pageFields = useMemo(
    () => fields.filter((f) => !f.block_id && f.page === currentPage),
    [fields, currentPage]
  );

  const selectField = useCallback((id: string | null) => {
    if (!isControlled) setInternalSelectedId(id);
    onFieldSelect?.(id);
  }, [isControlled, onFieldSelect]);

  /* ─── Click to place ─── */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (interactionState) return;
      if ((e.target as HTMLElement) === overlayRef.current) {
        if (!placementActive) { selectField(null); return; }
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
        template_id: templateId, block_id: null,
        signer_role: activeSignerRole, field_type: activeFieldType,
        page: currentPage, x: fx, y: fy, w: defaults.w, h: defaults.h,
        required: true, label: FIELD_LABELS[activeFieldType] || activeFieldType,
        meta: {
          relativeTo: "page",
          normalized: { x: fx, y: fy, w: defaults.w, h: defaults.h },
          appearance: { placeholderText: FIELD_LABELS[activeFieldType] || activeFieldType, borderStyle: "dashed", color: ROLE_BORDER[activeSignerRole] },
        } as any,
      });
    },
    [placementActive, interactionState, activeFieldType, activeSignerRole, templateId, currentPage, createField, selectField]
  );

  /* ─── Drag start ─── */
  const handleFieldMouseDown = useCallback((e: React.MouseEvent, field: TemplateField) => {
    e.stopPropagation(); e.preventDefault();
    selectField(field.id);
    setInteractionState({ type: "drag", fieldId: field.id });
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    startRef.current = { mx: e.clientX, my: e.clientY, ox: field.x, oy: field.y, ow: field.w, oh: field.h };
    setLivePos({ x: field.x, y: field.y, w: field.w, h: field.h });
  }, [selectField]);

  /* ─── Resize start ─── */
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, field: TemplateField, handle: ResizeHandle) => {
    e.stopPropagation(); e.preventDefault();
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
        setLivePos({ x: clamp(s.ox + dx, 0, 1 - s.ow), y: clamp(s.oy + dy, 0, 1 - s.oh), w: s.ow, h: s.oh });
      } else if (interactionState.handle) {
        setLivePos(applyResize(interactionState.handle, s.ox, s.oy, s.ow, s.oh, dx, dy));
      }
    };
    const handleUp = () => {
      if (livePos && interactionState.fieldId) {
        const field = pageFields.find((f) => f.id === interactionState.fieldId);
        updateField.mutate({
          id: interactionState.fieldId,
          x: livePos.x, y: livePos.y, w: livePos.w, h: livePos.h,
          meta: { ...(field?.meta as any), normalized: { x: livePos.x, y: livePos.y, w: livePos.w, h: livePos.h } },
        });
      }
      setInteractionState(null);
      setLivePos(null);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [interactionState, livePos, pageFields, updateField]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedFieldId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
        deleteField.mutate({ id: selectedFieldId, templateId });
        selectField(null);
      }
      if (e.key === "Escape") selectField(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedFieldId, templateId, deleteField, selectField]);

  /* ─── Native HTML drop support (from widget palette) ─── */
  const handleNativeDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const widgetType = e.dataTransfer.getData("widget_type") as FieldType;
    const signerRole = e.dataTransfer.getData("signer_role") as SignerRole;
    if (!widgetType || !signerRole) return;

    e.preventDefault();
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const defaults = FIELD_DEFAULT_SIZE[widgetType] || { w: 0.18, h: 0.04 };

    createField.mutate({
      template_id: templateId, block_id: null,
      signer_role: signerRole, field_type: widgetType,
      page: currentPage, x: clamp(nx - defaults.w / 2, 0, 1 - defaults.w), y: clamp(ny - defaults.h / 2, 0, 1 - defaults.h),
      w: defaults.w, h: defaults.h,
      required: true, label: FIELD_LABELS[widgetType] || widgetType,
      meta: {} as any,
    });
  }, [templateId, currentPage, createField]);

  /* ─── Render ─── */
  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 z-20 ${placementActive ? "cursor-crosshair" : "pointer-events-none"}`}
      onClick={handleClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleNativeDrop}
    >
      {pageFields.map((field) => {
        const Icon = FIELD_ICONS[field.field_type] || PenTool;
        const isSelected = selectedFieldId === field.id;
        const isInteracting = interactionState?.fieldId === field.id;
        const borderColor = ROLE_BORDER[field.signer_role];
        const bgColor = ROLE_COLORS[field.signer_role];
        const ringColor = ROLE_RING[field.signer_role];

        const pos = isInteracting && livePos
          ? livePos
          : { x: field.x, y: field.y, w: field.w, h: field.h };

        return (
          <div
            key={field.id}
            data-field-id={field.id}
            className="absolute flex items-center justify-center select-none group pointer-events-auto"
            style={{
              left: `${pos.x * 100}%`, top: `${pos.y * 100}%`,
              width: `${pos.w * 100}%`, height: `${pos.h * 100}%`,
              backgroundColor: bgColor,
              borderColor,
              borderWidth: isSelected ? 2.5 : 1.5,
              borderStyle: isSelected ? "solid" : "dashed",
              borderRadius: 4,
              cursor: "move",
              zIndex: isSelected ? 30 : 25,
              boxShadow: isSelected ? `0 0 0 3px ${ringColor}, 0 4px 12px rgba(0,0,0,0.15)` : "none",
              transition: "box-shadow 0.15s ease, border-width 0.1s ease",
            }}
            onMouseDown={(e) => handleFieldMouseDown(e, field)}
            onClick={(e) => { e.stopPropagation(); selectField(field.id); }}
          >
            {/* Role badge above field (OpenSign style) */}
            <div
              className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap pointer-events-none"
              style={{ backgroundColor: borderColor, color: "#fff" }}
            >
              {ROLE_LABELS[field.signer_role] || field.signer_role}
            </div>

            {/* Type-specific content */}
            {field.field_type === "checkbox" ? (
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 border-2 rounded-sm" style={{ borderColor }} />
                <span className="text-[8px] font-medium truncate" style={{ color: borderColor }}>
                  {field.label || "Check"}
                </span>
              </div>
            ) : field.field_type === "radio" ? (
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 border-2 rounded-full" style={{ borderColor }} />
                <span className="text-[8px] font-medium truncate" style={{ color: borderColor }}>
                  {field.label || "Radio"}
                </span>
              </div>
            ) : field.field_type === "dropdown" ? (
              <div className="flex items-center gap-1 w-full px-1">
                <span className="text-[8px] font-medium truncate flex-1" style={{ color: borderColor }}>
                  {field.label || "Desplegable"} ▾
                </span>
              </div>
            ) : field.field_type === "stamp" ? (
              <div className="flex flex-col items-center justify-center gap-0.5">
                <Icon className="h-4 w-4 shrink-0" style={{ color: borderColor }} />
                <span className="text-[7px] font-medium" style={{ color: borderColor }}>
                  {field.label || "Sello"}
                </span>
              </div>
            ) : field.field_type === "signature" ? (
              <div className="flex flex-col items-center justify-center gap-0.5 w-full">
                <Icon className="h-4 w-4 shrink-0" style={{ color: borderColor }} />
                <span className="text-[7px] font-medium" style={{ color: borderColor }}>
                  {field.label || "Firma"}
                </span>
              </div>
            ) : (
              <>
                <Icon className="h-3 w-3 shrink-0" style={{ color: borderColor }} />
                <span className="text-[8px] font-medium ml-0.5 truncate" style={{ color: borderColor }}>
                  {field.label || field.field_type}
                </span>
              </>
            )}

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

            {/* 8 resize handles */}
            {isSelected && (Object.entries(HANDLE_POSITIONS) as [ResizeHandle, typeof HANDLE_POSITIONS[ResizeHandle]][]).map(
              ([handle, { cursor, style }]) => (
                <div
                  key={handle}
                  className="absolute z-30 rounded-sm"
                  style={{
                    width: HANDLE_SIZE, height: HANDLE_SIZE, cursor,
                    backgroundColor: borderColor,
                    border: "1.5px solid hsl(var(--background))",
                    ...style,
                  }}
                  onMouseDown={(e) => handleResizeMouseDown(e, field, handle)}
                />
              )
            )}

            {/* Position tooltip during interaction */}
            {isInteracting && livePos && (
              <div
                className="absolute -top-7 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap shadow-md pointer-events-none"
                style={{ backgroundColor: borderColor, color: "#fff" }}
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
