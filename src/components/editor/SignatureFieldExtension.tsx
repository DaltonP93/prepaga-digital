
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, PenTool, ShieldCheck, RotateCcw, User, Calendar, Hash } from 'lucide-react';

// ── TipTap Node Extension ──────────────────────────────────────────────

export const SignatureFieldExtension = Node.create({
  name: 'signatureField',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      id: { default: '' },
      size: { default: 'normal' },
      signatureType: { default: 'both' }, // 'digital' | 'electronic' | 'both'
      label: { default: 'Firma del Cliente' },
      signerRole: { default: 'cliente' }, // 'cliente' | 'empresa' | 'testigo'
      required: { default: true },
      showSignerInfo: { default: true },
      showDate: { default: true },
      showToken: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-signature-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
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
        class: 'signature-field my-4 p-4 border-2 border-dashed border-primary/40 rounded-lg bg-primary/5',
      },
      ['div', { class: 'text-center text-sm text-muted-foreground' }, HTMLAttributes.label],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureFieldComponent);
  },
});

// ── Mini Canvas for preview ────────────────────────────────────────────

const MiniSignatureCanvas: React.FC<{
  onSign: (data: string) => void;
  onClear: () => void;
  signed: boolean;
}> = ({ onSign, onClear, signed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
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
    setHasContent(false);
    onClear();
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={300}
        height={100}
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

// ── Electronic Signature Token Generator ───────────────────────────────
// Generates a UUID-based token per RFC 4122 / ISO/IEC 9834-8 standard

const generateSignatureToken = (): string => {
  // RFC 4122 v4 UUID
  return crypto.randomUUID();
};

const formatSignatureTimestamp = (): string => {
  // ISO 8601 / RFC 3339 compliant timestamp
  return new Date().toISOString();
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

  // Preview state
  const [previewSigned, setPreviewSigned] = useState(false);
  const [previewSignatureData, setPreviewSignatureData] = useState<string | null>(null);

  const handleSave = () => {
    updateAttributes({
      label,
      signatureType,
      signerRole,
      required,
      showSignerInfo,
      showDate,
      showToken,
    });
    setIsEditing(false);
  };

  const signerRoleLabels: Record<string, string> = {
    cliente: 'Cliente / Titular',
    empresa: 'Representante de Empresa',
    testigo: 'Testigo',
  };

  const signatureTypeLabels: Record<string, string> = {
    digital: 'Solo Firma Digital (manuscrita)',
    electronic: 'Solo Firma Electrónica (token)',
    both: 'Ambas (Digital + Electrónica)',
  };

  const previewToken = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const previewTimestamp = '2026-02-15T12:00:00.000Z';

  return (
    <NodeViewWrapper className="signature-field-wrapper">
      <div
        className={`border-2 border-dashed rounded-lg my-4 p-4 transition-colors ${
          selected ? 'border-primary bg-primary/5' : 'border-amber-400 bg-amber-50'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700 font-semibold text-sm">
              Campo de Firma
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {signatureType === 'digital' ? 'Digital' : signatureType === 'electronic' ? 'Electrónica' : 'Ambas'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-7 w-7 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {isEditing ? (
          /* ── Configuration Panel ─────────────────────────── */
          <div className="space-y-4 bg-background rounded-lg p-3 border">
            <div>
              <Label className="text-xs font-medium">Etiqueta</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="text-sm mt-1"
                placeholder="Ej: Firma del Cliente"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Tipo de Firma</Label>
              <Select value={signatureType} onValueChange={setSignatureType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
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

            <Button onClick={handleSave} size="sm" className="w-full">
              Guardar Configuración
            </Button>
          </div>
        ) : (
          /* ── Preview ─────────────────────────────────────── */
          <div className="space-y-3">
            <div className="text-sm font-medium text-center">
              {label} {required && <span className="text-destructive">*</span>}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Rol: {signerRoleLabels[signerRole] || signerRole}
            </div>

            {/* Digital signature area */}
            {(signatureType === 'digital' || signatureType === 'both') && (
              <div className="bg-white rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <PenTool className="h-3 w-3" />
                  Firma Digital (manuscrita)
                </div>
                <MiniSignatureCanvas
                  onSign={(data) => { setPreviewSigned(true); setPreviewSignatureData(data); }}
                  onClear={() => { setPreviewSigned(false); setPreviewSignatureData(null); }}
                  signed={previewSigned}
                />
              </div>
            )}

            {/* Electronic signature info */}
            {(signatureType === 'electronic' || signatureType === 'both') && (
              <div className="bg-white rounded-lg border p-3 space-y-2">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Firma Electrónica (datos automáticos)
                </div>

                {showSignerInfo && (
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Firmante:</span>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                      {'{{nombre_firmante}}'}
                    </span>
                  </div>
                )}

                {showDate && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                      {previewTimestamp}
                    </span>
                  </div>
                )}

                {showToken && (
                  <div className="flex items-center gap-2 text-xs">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Token UUID:</span>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                      {previewToken}
                    </span>
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground mt-2 border-t pt-2">
                  Conforme a <strong>RFC 4122</strong> (UUID) · <strong>ISO 8601</strong> (Timestamp) · <strong>eIDAS / ESIGN Act</strong>
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
