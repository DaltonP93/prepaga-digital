import React from "react";
import { DragOverlay } from "@dnd-kit/core";
import { FIELD_TYPES } from "./FieldOverlay";
import type { WidgetDragData } from "@/lib/widgetUtils";

interface WidgetDragOverlayProps {
  activeData: WidgetDragData | null;
}

/**
 * Ghost preview shown while dragging a widget from the sidebar.
 * Equivalent to OpenSign's WidgetsDragPreview.jsx.
 */
export const WidgetDragOverlay: React.FC<WidgetDragOverlayProps> = ({ activeData }) => {
  if (!activeData) return <DragOverlay dropAnimation={null} />;

  const ft = FIELD_TYPES.find((f) => f.value === activeData.fieldType);
  if (!ft) return <DragOverlay dropAnimation={null} />;

  const Icon = ft.icon;

  return (
    <DragOverlay dropAnimation={null}>
      <div className="flex items-center gap-2 rounded-md border-2 border-primary bg-primary/10 px-3 py-2 text-[12px] font-semibold text-primary shadow-lg pointer-events-none">
        <Icon className="h-4 w-4" />
        {ft.label}
      </div>
    </DragOverlay>
  );
};
