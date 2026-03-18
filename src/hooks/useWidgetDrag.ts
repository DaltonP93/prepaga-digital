import { useCallback, useRef } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { FieldType, SignerRole } from "@/types/templateDesigner";
import { FIELD_DEFAULT_SIZE, FIELD_LABELS, clamp, type WidgetDragData } from "@/lib/widgetUtils";

interface UseWidgetDragOptions {
  templateId: string;
  currentPage: number;
  activeRole: SignerRole;
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
  titular: "#3b82f6",
  adherente: "#10b981",
  contratada: "#f59e0b",
};

/**
 * Consolidates drag-and-drop logic for placing widgets on the canvas.
 * Uses querySelectorAll('[data-a4-page="true"]') to detect which page
 * receives the drop, supporting multi-page scroll layouts.
 */
export function useWidgetDrag({
  templateId,
  currentPage,
  activeRole,
  zoom,
  onCreateField,
}: UseWidgetDragOptions) {
  const activeDragDataRef = useRef<WidgetDragData | null>(null);

  /**
   * Given a pointer event from the drag end, find which A4 page the pointer
   * is over and compute normalized 0..1 coordinates relative to that page.
   * Returns { x, y, page } or null if not over any page.
   */
  const getDropCoordinates = useCallback(
    (event: DragEndEvent): { x: number; y: number; page: number } | null => {
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

      // Iterate all A4 page elements to find the one under the pointer
      const pages = document.querySelectorAll<HTMLElement>('[data-a4-page="true"]');
      for (const pageEl of pages) {
        const rect = pageEl.getBoundingClientRect();

        // Check if pointer is within this page (with small tolerance)
        const tolerance = 10;
        if (
          pointerX >= rect.left - tolerance &&
          pointerX <= rect.right + tolerance &&
          pointerY >= rect.top - tolerance &&
          pointerY <= rect.bottom + tolerance
        ) {
          const relX = (pointerX - rect.left) / rect.width;
          const relY = (pointerY - rect.top) / rect.height;

          const pageNum = Number(pageEl.getAttribute("data-page-num")) || currentPage;

          return {
            x: clamp(relX, 0, 1),
            y: clamp(relY, 0, 1),
            page: pageNum,
          };
        }
      }

      return null;
    },
    [currentPage]
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

      // Calculate real drop position and detect target page
      const dropPos = getDropCoordinates(event);

      let fx: number, fy: number;
      let targetPage = currentPage;

      if (dropPos) {
        fx = clamp(dropPos.x - defaults.w / 2, 0, 1 - defaults.w);
        fy = clamp(dropPos.y - defaults.h / 2, 0, 1 - defaults.h);
        targetPage = dropPos.page;
      } else {
        fx = clamp(0.5 - defaults.w / 2, 0, 1 - defaults.w);
        fy = clamp(0.5 - defaults.h / 2, 0, 1 - defaults.h);
      }

      onCreateField({
        template_id: templateId,
        block_id: null,
        signer_role: activeRole,
        field_type: fieldType,
        page: targetPage,
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
