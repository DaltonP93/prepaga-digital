import { useEffect, useRef, type RefObject } from "react";

/**
 * Adds pinch-to-zoom (touch) and Ctrl+wheel zoom to a container element.
 * Adapted from OpenSign's usePdfPinchZoom for the SAMAP Designer 2.0 canvas.
 */
export default function usePdfPinchZoom(
  ref: RefObject<HTMLElement | null>,
  zoom: number,
  setZoom: (z: number) => void,
) {
  const zoomRef = useRef(zoom);
  const initialDistanceRef = useRef<number | null>(null);
  const startZoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* ── Ctrl / Meta + Wheel → zoom ── */
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      const next = Math.max(30, Math.min(200, zoomRef.current + delta));
      setZoom(next);
    };

    /* ── Touch pinch ── */
    const getDistance = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistanceRef.current = getDistance(e.touches);
        startZoomRef.current = zoomRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || initialDistanceRef.current === null) return;
      e.preventDefault();
      const dist = getDistance(e.touches);
      const scale = dist / initialDistanceRef.current;
      const next = Math.max(30, Math.min(200, Math.round(startZoomRef.current * scale)));
      setZoom(next);
    };

    const handleTouchEnd = () => {
      initialDistanceRef.current = null;
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, setZoom]);
}
