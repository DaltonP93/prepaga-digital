import type { FieldType } from "@/types/templateDesigner";

/** Default normalized sizes (0..1) for each widget type */
export const FIELD_DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  signature: { w: 0.2, h: 0.06 },
  initials: { w: 0.08, h: 0.04 },
  date: { w: 0.15, h: 0.03 },
  text: { w: 0.2, h: 0.03 },
  checkbox: { w: 0.03, h: 0.03 },
  name: { w: 0.2, h: 0.03 },
  dni: { w: 0.15, h: 0.03 },
  email: { w: 0.2, h: 0.03 },
  stamp: { w: 0.15, h: 0.1 },
  dropdown: { w: 0.2, h: 0.03 },
  radio: { w: 0.03, h: 0.03 },
};

export const FIELD_LABELS: Record<string, string> = {
  signature: "Firma",
  initials: "Iniciales",
  date: "Fecha",
  text: "Texto",
  checkbox: "Check",
  name: "Nombre",
  dni: "C.I.",
  email: "Email",
  stamp: "Sello",
  dropdown: "Desplegable",
  radio: "Radio",
};

export const MIN_W = 0.03;
export const MIN_H = 0.02;

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function applyResize(
  handle: ResizeHandle,
  ox: number, oy: number, ow: number, oh: number,
  dx: number, dy: number,
): { x: number; y: number; w: number; h: number } {
  let x = ox, y = oy, w = ow, h = oh;
  if (handle.includes("e")) w = clamp(ow + dx, MIN_W, 1 - ox);
  if (handle.includes("w")) { const nw = clamp(ow - dx, MIN_W, ox + ow); x = ox + ow - nw; w = nw; }
  if (handle.includes("s")) h = clamp(oh + dy, MIN_H, 1 - oy);
  if (handle.includes("n")) { const nh = clamp(oh - dy, MIN_H, oy + oh); y = oy + oh - nh; h = nh; }
  return { x, y, w, h };
}

/** @dnd-kit drag data shape for widget placement */
export interface WidgetDragData {
  type: "widget";
  fieldType: FieldType;
}
