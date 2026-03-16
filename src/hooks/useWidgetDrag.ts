import { useCallback, useRef } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { FieldType, SignerRole } from "@/types/templateDesigner";
import { FIELD_DEFAULT_SIZE, FIELD_LABELS, clamp, type WidgetDragData } from "@/lib/widgetUtils";

interface UseWidgetDragOptions {
  templateId: string;
  currentPage: number;
  activeRole: SignerRole;
  /** CSS selector or ref to the A4 page element inside the canvas */
  pageSelector: string;
  zoom: number;
  onCreateField: (params: {
    template_id: string;
    block_id: null;
    signer_role: SignerRole;
    field_type: FieldType;
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
    required: boolean;
    label: string;
    meta: Record<string, unknown>;
  }) => void;
}

const ROLE_BORDER: Record<SignerRole, string> = {
  titular: "#2563eb",
  adherente: "#16a34a",
  contratada: "#9333ea",
};

/**
 * Consolidates drag-and-drop logic for placing widgets on the canvas.
 * Equivalent to OpenSign's useWidgetDrag.js but adapted for @dnd-kit
 * and our normalized 0..1 coordinate system.
 */
export function useWidgetDrag({
  templateId,
  currentPage,
  activeRole,
  pageSelector,
  zoom,
  onCreateField,
}: UseWidgetDragOptions) {
  const activeDragDataRef = useRef<WidgetDragData | null>(null);

  /**
   * Given a pointer event from the drag end, compute normalized 0..1
   * coordinates relative to the A4 page element, accounting for zoom/scale.
   */
  const getDropCoordinates = useCallback(
    (event: DragEndEvent): { x: number; y: number } | null => {
      // Try to get pointer position from the activatorEvent (the original mouse/touch event)
      // or from delta + initial position
      const pageEl = document.querySelector(pageSelector) as HTMLElement | null;
      if (!pageEl) return null;

      const pageRect = pageEl.getBoundingClientRect();
      const scale = zoom / 100;

      // The actual rendered size of the A4 page (after CSS transform: scale)
      // getBoundingClientRect already reflects the transform, so pageRect
      // already contains scaled dimensions.

      // Get pointer coordinates: DragEndEvent has `activatorEvent` (the original
      // mousedown) plus `delta` (cumulative movement during drag).
      const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent | null;
      if (!activatorEvent) return null;

      let startX: number, startY: number;
      if ("clientX" in activatorEvent) {
        startX = activatorEvent.clientX;
        startY = activatorEvent.clientY;
      } else if ("touches" in activatorEvent && activatorEvent.touches.length > 0) {
        startX = activatorEvent.touches[0].clientX;
        startY = activatorEvent.touches[0].clientY;
      } else {
        return null;
      }

      const delta = event.delta;
      const pointerX = startX + delta.x;
      const pointerY = startY + delta.y;

      // Convert pointer to position within the A4 page.
      // pageRect is already in scaled screen space, so just use it directly.
      const relX = (pointerX - pageRect.left) / pageRect.width;
      const relY = (pointerY - pageRect.top) / pageRect.height;

      // Only valid if within the page bounds (with some tolerance)
      if (relX < -0.05 || relX > 1.05 || relY < -0.05 || relY > 1.05) {
        return null;
      }

      return {
        x: clamp(relX, 0, 1),
        y: clamp(relY, 0, 1),
      };
    },
    [pageSelector, zoom]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as WidgetDragData | undefined;
    if (data?.type === "widget") {
      activeDragDataRef.current = data;
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeData = activeDragDataRef.current;
      activeDragDataRef.current = null;

      const { over } = event;
      if (!over || over.id !== "canvas-drop-zone") return;
      if (!activeData || activeData.type !== "widget") return;

      const fieldType = activeData.fieldType;
      const defaults = FIELD_DEFAULT_SIZE[fieldType] || { w: 0.18, h: 0.04 };

      // Calculate real drop position
      const dropPos = getDropCoordinates(event);

      let fx: number, fy: number;
      if (dropPos) {
        // Center the widget on the drop point
        fx = clamp(dropPos.x - defaults.w / 2, 0, 1 - defaults.w);
        fy = clamp(dropPos.y - defaults.h / 2, 0, 1 - defaults.h);
      } else {
        // Fallback: center of canvas
        fx = clamp(0.5 - defaults.w / 2, 0, 1 - defaults.w);
        fy = clamp(0.5 - defaults.h / 2, 0, 1 - defaults.h);
      }

      onCreateField({
        template_id: templateId,
        block_id: null,
        signer_role: activeRole,
        field_type: fieldType,
        page: currentPage,
        x: fx,
        y: fy,
        w: defaults.w,
        h: defaults.h,
        required: true,
        label: FIELD_LABELS[fieldType] || fieldType,
        meta: {
          relativeTo: "page",
          normalized: { x: fx, y: fy, w: defaults.w, h: defaults.h },
          appearance: {
            placeholderText: FIELD_LABELS[fieldType] || fieldType,
            borderStyle: "dashed",
            color: ROLE_BORDER[activeRole],
          },
        },
      });
    },
    [activeRole, currentPage, templateId, getDropCoordinates, onCreateField]
  );

  return {
    activeDragData: activeDragDataRef,
    handleDragStart,
    handleDragEnd,
    getDropCoordinates,
  };
}
