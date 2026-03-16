import React, { useCallback, useRef, useState, useEffect } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, Trash2, GripVertical } from "lucide-react";

/* ─── NodeView Component ─── */

const ResizableImageView: React.FC<any> = ({ node, updateAttributes, deleteNode, selected }) => {
  const { src, alt, width, height, float: floatAttr, display } = node.attrs;
  const imgRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      setIsResizing(true);
      startRef.current = {
        mx: e.clientX,
        my: e.clientY,
        w: img.offsetWidth,
        h: img.offsetHeight,
      };

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startRef.current.mx;
        const ratio = startRef.current.h / startRef.current.w;
        const newW = Math.max(50, startRef.current.w + dx);
        const newH = Math.round(newW * ratio);
        if (img) {
          img.style.width = `${newW}px`;
          img.style.height = `${newH}px`;
        }
      };

      const handleUp = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
        const dx = ev.clientX - startRef.current.mx;
        const newW = Math.max(50, startRef.current.w + dx);
        const ratio = startRef.current.h / startRef.current.w;
        const newH = Math.round(newW * ratio);
        updateAttributes({ width: newW, height: newH });
        setIsResizing(false);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [updateAttributes]
  );

  const alignStyle: React.CSSProperties =
    floatAttr === "left"
      ? { float: "left", marginRight: "1em", marginBottom: "0.5em" }
      : floatAttr === "right"
      ? { float: "right", marginLeft: "1em", marginBottom: "0.5em" }
      : { display: "block", marginLeft: "auto", marginRight: "auto" };

  return (
    <NodeViewWrapper
      as="div"
      className={`resizable-image-wrapper ${selected ? "resizable-image-selected" : ""}`}
      style={{ ...alignStyle, position: "relative", width: "fit-content", maxWidth: "100%" }}
      draggable
      data-drag-handle
    >
      {/* Floating toolbar */}
      {selected && (
        <div className="resizable-image-toolbar">
          <button
            type="button"
            title="Izquierda"
            className={floatAttr === "left" ? "active" : ""}
            onClick={() => updateAttributes({ float: "left" })}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Centro"
            className={floatAttr === "none" ? "active" : ""}
            onClick={() => updateAttributes({ float: "none" })}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Derecha"
            className={floatAttr === "right" ? "active" : ""}
            onClick={() => updateAttributes({ float: "right" })}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
          <div className="resizable-image-toolbar-sep" />
          <button type="button" title="Eliminar" onClick={deleteNode}>
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt || ""}
        style={{
          width: typeof width === "number" ? `${width}px` : width === "auto" ? undefined : width,
          height: typeof height === "number" ? `${height}px` : "auto",
          maxWidth: "100%",
          cursor: "default",
        }}
        draggable={false}
      />

      {/* Resize handles */}
      {selected && (
        <>
          <div className="resizable-handle resizable-handle-br" onMouseDown={(e) => handleResizeStart(e, "br")} />
          <div className="resizable-handle resizable-handle-bl" onMouseDown={(e) => handleResizeStart(e, "bl")} />
          <div className="resizable-handle resizable-handle-tr" onMouseDown={(e) => handleResizeStart(e, "tr")} />
          <div className="resizable-handle resizable-handle-tl" onMouseDown={(e) => handleResizeStart(e, "tl")} />
        </>
      )}
    </NodeViewWrapper>
  );
};

/* ─── TipTap Extension ─── */

export const ResizableImageExtension = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: "auto" },
      height: { default: "auto" },
      float: { default: "none" },
      display: { default: "block" },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { float: floatAttr, display, width, height, ...rest } = HTMLAttributes;
    const style: string[] = [];
    if (typeof width === "number") style.push(`width:${width}px`);
    else if (width && width !== "auto") style.push(`width:${width}`);
    if (typeof height === "number") style.push(`height:${height}px`);
    if (floatAttr === "left") style.push("float:left;margin-right:1em;margin-bottom:0.5em");
    else if (floatAttr === "right") style.push("float:right;margin-left:1em;margin-bottom:0.5em");
    else style.push("display:block;margin-left:auto;margin-right:auto");

    return ["img", mergeAttributes(rest, { style: style.join(";") })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs: options }),
    };
  },
});
