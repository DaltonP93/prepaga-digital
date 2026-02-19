
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Settings, PenTool, ShieldCheck, RotateCcw, User, Calendar, Hash, GripVertical, AlignLeft, AlignRight, AlignCenter } from 'lucide-react';

// ── TipTap Node Extension ──────────────────────────────────────────────

export const SignatureFieldExtension = Node.create({
  name: 'signatureField',
  group: 'block',
  atom: true,
  draggable: true,
  inline: false,
  selectable: true,

  addAttributes() {
    return {
      id: { default: '' },
      size: { default: 'normal' },
      signatureType: { default: 'both' },
      label: { default: 'Firma del Cliente' },
      signerRole: { default: 'cliente' },
      required: { default: true },
      showSignerInfo: { default: true },
      showDate: { default: true },
      showToken: { default: true },
      width: { default: 100 },
      height: { default: 200 },
      float: { default: 'none' }, // none, left, right
    };
  },




  parseHTML() {
    return [{ tag: 'div[data-signature-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const floatStyle = HTMLAttributes.float === 'left' ? 'float: left; margin-right: 16px;'
      : HTMLAttributes.float === 'right' ? 'float: right; margin-left: 16px;'
      : '';
    return [
      'div',
      {
        'data-signature-field': 'true',
        'data-signature-type': HTMLAttributes.signatureType,
        'data-signer-role': HTMLAttributes.signerRole,
        'data-label': HTMLAttributes.label,
        'data-required': HTMLAttributes.required,
        'data-show-signer-info': HTMLAttributes.showSignerInfo,
        'data-show-date': HTMLAttributes.showDate,
        'data-show-token': HTMLAttributes.showToken,
        'data-float': HTMLAttributes.float,
        style: `width: ${HTMLAttributes.width}%; min-height: ${HTMLAttributes.height}px; display: inline-block; vertical-align: top; ${floatStyle}`,
        class: 'signature-field my-2 p-4 border-2 border-dashed border-primary/40 rounded-lg bg-primary/5',
      },
      ['div', { class: 'text-center text-sm text-muted-foreground' }, HTMLAttributes.label],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureFieldComponent);
  },
});

// ── Mini Canvas ────────────────────────────────────────────────────────

const MiniSignatureCanvas: React.FC<{
  onSign: (data: string) => void;
  onClear: () => void;
  signed: boolean;
  canvasHeight: number;
}> = ({ onSign, onClear, signed, canvasHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, canvas.height - 15);
    ctx.lineTo(canvas.width - 10, canvas.height - 15);
    ctx.stroke();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasContent(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (hasContent && canvasRef.current) {
      onSign(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    setHasContent(false);
    initCanvas();
    onClear();
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={300}
        height={Math.max(60, canvasHeight - 80)}
        className="border border-border rounded cursor-crosshair touch-none w-full"
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={stop}
      />
      {hasContent && (
        <Button variant="outline" size="sm" onClick={clear} className="gap-1">
          <RotateCcw className="h-3 w-3" />
          Limpiar
        </Button>
      )}
    </div>
  );
};

// ── Resize Handle Hook ─────────────────────────────────────────────────

const useResizable = (
  initialWidth: number,
  initialHeight: number,
  onResize: (w: number, h: number) => void,
  containerRef: React.RefObject<HTMLDivElement>
) => {
  const isResizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const corner = useRef<'se' | 'e' | 's'>('se');

  const onMouseDown = useCallback((e: React.MouseEvent, dir: 'se' | 'e' | 's') => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    corner.current = dir;
    const el = containerRef.current;
    if (!el) return;
    startPos.current = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight };

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const dx = ev.clientX - startPos.current.x;
      const dy = ev.clientY - startPos.current.y;
      let newW = startPos.current.w;
      let newH = startPos.current.h;
      if (corner.current === 'e' || corner.current === 'se') newW = Math.max(150, startPos.current.w + dx);
      if (corner.current === 's' || corner.current === 'se') newH = Math.max(100, startPos.current.h + dy);
      if (el) {
        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
      }
    };

    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const el = containerRef.current;
      if (el) {
        // Convert width to percentage of parent
        const parent = el.parentElement;
        const parentWidth = parent ? parent.offsetWidth : el.offsetWidth;
        const pct = Math.round(Math.min(100, Math.max(20, (el.offsetWidth / parentWidth) * 100)));
        onResize(pct, el.offsetHeight);
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [containerRef, onResize]);

  return { onMouseDown };
};

// ── Main Component ─────────────────────────────────────────────────────

const SignatureFieldComponent = ({ node, updateAttributes, selected }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(node.attrs.label);
  const [signatureType, setSignatureType] = useState(node.attrs.signatureType);
  const [signerRole, setSignerRole] = useState(node.attrs.signerRole);
  const [required, setRequired] = useState(node.attrs.required);
  const [showSignerInfo, setShowSignerInfo] = useState(node.attrs.showSignerInfo);
  const [showDate, setShowDate] = useState(node.attrs.showDate);
  const [showToken, setShowToken] = useState(node.attrs.showToken);
  const [width, setWidth] = useState(node.attrs.width || 100);
  const [height, setHeight] = useState(node.attrs.height || 200);
  const containerRef = useRef<HTMLDivElement>(null);
  const [floatDir, setFloatDir] = useState<'none' | 'left' | 'right'>(node.attrs.float || 'none');

  const [previewSigned, setPreviewSigned] = useState(false);

  const handleResize = useCallback((newWidthPct: number, newHeightPx: number) => {
    setWidth(newWidthPct);
    setHeight(newHeightPx);
    updateAttributes({ width: newWidthPct, height: newHeightPx });
  }, [updateAttributes]);

  const { onMouseDown } = useResizable(width, height, handleResize, containerRef as React.RefObject<HTMLDivElement>);

  const handleSave = () => {
    updateAttributes({ label, signatureType, signerRole, required, showSignerInfo, showDate, showToken, width, height, float: floatDir });
    setIsEditing(false);
  };

  const toggleFloat = (dir: 'none' | 'left' | 'right') => {
    const newDir = floatDir === dir ? 'none' : dir;
    setFloatDir(newDir);
    updateAttributes({ float: newDir });
  };

  const signerRoleLabels: Record<string, string> = {
    cliente: 'Cliente / Titular',
    empresa: 'Representante de Empresa',
    testigo: 'Testigo',
  };

  const previewToken = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const previewTimestamp = '2026-02-15T12:00:00.000Z';

  return (
    <NodeViewWrapper className="signature-field-wrapper" style={{
      float: floatDir !== 'none' ? floatDir : undefined,
      display: 'inline-block',
      verticalAlign: 'top',
      marginRight: floatDir === 'left' ? '16px' : undefined,
      marginLeft: floatDir === 'right' ? '16px' : undefined,
      width: `${width}%`,
    }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: `${height}px` }}
        className={`border-2 border-dashed rounded-lg my-2 p-4 transition-colors relative overflow-hidden ${
          selected ? 'border-primary bg-primary/5' : 'border-amber-400 bg-amber-50'
        }`}
      >
        {/* Drag handle */}
        <div
          contentEditable={false}
          data-drag-handle
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground z-10"
          title="Arrastrar para mover"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Resize handles */}
        {/* Right edge */}
        <div
          contentEditable={false}
          onMouseDown={(e) => onMouseDown(e, 'e')}
          className="absolute top-0 right-0 w-2 h-full cursor-ew-resize z-10 hover:bg-primary/20 transition-colors"
        />
        {/* Bottom edge */}
        <div
          contentEditable={false}
          onMouseDown={(e) => onMouseDown(e, 's')}
          className="absolute bottom-0 left-0 h-2 w-full cursor-ns-resize z-10 hover:bg-primary/20 transition-colors"
        />
        {/* Bottom-right corner */}
        <div
          contentEditable={false}
          onMouseDown={(e) => onMouseDown(e, 'se')}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 flex items-center justify-center"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground">
            <path d="M9 1v8H1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M9 5v4H5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pl-6">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700 font-semibold text-sm">Firma</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {signatureType === 'digital' ? 'Digital' : signatureType === 'electronic' ? 'Electrónica' : 'Ambas'}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant={floatDir === 'left' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => toggleFloat('left')}
              className="h-6 w-6 p-0"
              title="Acoplar a la izquierda"
            >
              <AlignLeft className="h-3 w-3" />
            </Button>
            <Button
              variant={floatDir === 'none' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => { setFloatDir('none'); updateAttributes({ float: 'none' }); }}
              className="h-6 w-6 p-0"
              title="Bloque completo"
            >
              <AlignCenter className="h-3 w-3" />
            </Button>
            <Button
              variant={floatDir === 'right' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => toggleFloat('right')}
              className="h-6 w-6 p-0"
              title="Acoplar a la derecha"
            >
              <AlignRight className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-muted-foreground mx-1">{width}%</span>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="h-7 w-7 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4 bg-background rounded-lg p-3 border" onPointerDown={(e) => e.stopPropagation()}>
            <div>
              <Label className="text-xs font-medium">Etiqueta</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} className="text-sm mt-1" placeholder="Ej: Firma del Cliente" />
            </div>

            <div>
              <Label className="text-xs font-medium">Tipo de Firma</Label>
              <Select value={signatureType} onValueChange={setSignatureType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Ambas (Digital + Electrónica)</SelectItem>
                  <SelectItem value="digital">Solo Digital (manuscrita)</SelectItem>
                  <SelectItem value="electronic">Solo Electrónica (token)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Rol del Firmante</Label>
              <Select value={signerRole} onValueChange={setSignerRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente / Titular</SelectItem>
                  <SelectItem value="empresa">Representante de Empresa</SelectItem>
                  <SelectItem value="testigo">Testigo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium">Opciones de Firma Electrónica</Label>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mostrar datos del firmante</Label>
                <Switch checked={showSignerInfo} onCheckedChange={setShowSignerInfo} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mostrar fecha/hora de firma</Label>
                <Switch checked={showDate} onCheckedChange={setShowDate} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Token digital (UUID RFC 4122)</Label>
                <Switch checked={showToken} onCheckedChange={setShowToken} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Campo obligatorio</Label>
                <Switch checked={required} onCheckedChange={setRequired} />
              </div>
            </div>

            <Button onClick={handleSave} size="sm" className="w-full">Guardar Configuración</Button>
          </div>
        ) : (
          <div className="space-y-2 overflow-auto" style={{ maxHeight: `${height - 60}px` }}>
            <div className="text-sm font-medium text-center">
              {label} {required && <span className="text-destructive">*</span>}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Rol: {signerRoleLabels[signerRole] || signerRole}
            </div>

            {(signatureType === 'digital' || signatureType === 'both') && (
              <div className="bg-background rounded-lg border p-2">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <PenTool className="h-3 w-3" /> Firma Digital (manuscrita)
                </div>
                <MiniSignatureCanvas
                  onSign={() => setPreviewSigned(true)}
                  onClear={() => setPreviewSigned(false)}
                  signed={previewSigned}
                  canvasHeight={Math.min(height - 120, 160)}
                />
              </div>
            )}

            {/* Aclaración y C.I. N.º – datos del firmante */}
            <div className="border-t border-border pt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">Aclaración:</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] truncate">
                  {signerRole === 'empresa' ? '{{representante_nombre}}' : signerRole === 'testigo' ? '{{testigo_nombre}}' : '{{titular_nombre}}'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">C.I. N.º:</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] truncate">
                  {signerRole === 'empresa' ? '{{representante_dni}}' : signerRole === 'testigo' ? '{{testigo_dni}}' : '{{titular_dni}}'}
                </span>
              </div>
            </div>

            {(signatureType === 'electronic' || signatureType === 'both') && (
              <div className="bg-background rounded-lg border p-2 space-y-1">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Firma Electrónica
                </div>
                {showDate && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{previewTimestamp}</span>
                  </div>
                )}
                {showToken && (
                  <div className="flex items-center gap-2 text-xs">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Token:</span>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] truncate">{previewToken}</span>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1 border-t pt-1">
                  <strong>RFC 4122</strong> · <strong>ISO 8601</strong> · <strong>eIDAS</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default SignatureFieldExtension;
