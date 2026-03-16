import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Settings2, Type, Heading, PenTool, FileUp, Lightbulb,
  Tag, Upload, ImageIcon, Link, Trash2, Replace,
} from "lucide-react";
import type { TemplateBlock, SignerRole, BlockType } from "@/types/templateDesigner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BlockPropertyPanelProps {
  block: TemplateBlock | null;
  onUpdate: (updates: Partial<TemplateBlock>) => void;
  onAddBlock?: (type: BlockType) => void;
  templateId?: string;
  onRequestPickImage?: () => void;
}

const SIGNER_ROLES: { value: SignerRole; label: string }[] = [
  { value: "titular", label: "Titular / Contratante" },
  { value: "adherente", label: "Adherente" },
  { value: "contratada", label: "Contratada / Empresa" },
];

const COMMON_PLACEHOLDERS = [
  { key: "nombre_completo_cliente", label: "Nombre completo" },
  { key: "documento_cliente", label: "Documento" },
  { key: "email_cliente", label: "Email" },
  { key: "telefono_cliente", label: "Teléfono" },
  { key: "fecha_actual", label: "Fecha actual" },
  { key: "empresa_nombre", label: "Empresa" },
  { key: "plan_nombre", label: "Plan" },
  { key: "monto_total", label: "Monto total" },
];

const TIPS = [
  "Arrastrá bloques para reordenarlos",
  "Usá el bloque Firma para cada firmante",
  "Las Variables se reemplazan automáticamente",
];

export const BlockPropertyPanel: React.FC<BlockPropertyPanelProps> = ({
  block, onUpdate, onAddBlock, templateId,
}) => {
  if (!block) {
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-4">
          {/* Quick actions */}
          {onAddBlock && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Acciones rápidas
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { type: "text" as BlockType, label: "Texto", icon: Type },
                  { type: "heading" as BlockType, label: "Título", icon: Heading },
                  { type: "signature_block" as BlockType, label: "Firma", icon: PenTool },
                  { type: "placeholder_chip" as BlockType, label: "Variable", icon: Tag },
                ].map((a) => (
                  <Button
                    key={a.type}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] gap-1.5 justify-start"
                    onClick={() => onAddBlock(a.type)}
                  >
                    <a.icon className="h-3.5 w-3.5" />
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Placeholders */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Placeholders disponibles
            </p>
            <div className="flex flex-wrap gap-1">
              {COMMON_PLACEHOLDERS.map((p) => (
                <Badge
                  key={p.key}
                  variant="secondary"
                  className="text-[10px] cursor-default"
                  title={`{{${p.key}}}`}
                >
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Tips */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Tips
            </p>
            <ul className="space-y-1">
              {TIPS.map((t, i) => (
                <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                  • {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollArea>
    );
  }

  const content = block.content as any;
  const style = block.style as any;
  const visibility = block.visibility_rules as any;

  const updateContent = (key: string, value: any) => {
    onUpdate({ content: { ...content, [key]: value } as any });
  };
  const updateStyle = (key: string, value: any) => {
    onUpdate({ style: { ...style, [key]: value } });
  };
  const updateVisibilityRoles = (role: SignerRole, checked: boolean) => {
    const currentRoles: SignerRole[] = visibility?.roles || ["titular", "adherente", "contratada"];
    const newRoles = checked
      ? [...currentRoles, role]
      : currentRoles.filter((r: SignerRole) => r !== role);
    onUpdate({ visibility_rules: { ...visibility, roles: newRoles } as any });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Propiedades
          </p>
          <Badge variant="outline" className="text-[10px]">{block.block_type}</Badge>
        </div>

        {/* Type-specific */}
        <TypeProperties
          block={block}
          content={content}
          style={style}
          updateContent={updateContent}
          updateStyle={updateStyle}
          templateId={templateId}
          onUpdate={onUpdate}
        />

        <Separator />

        {/* General */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Página</Label>
              <Input type="number" className="h-7 text-xs" value={block.page} onChange={(e) => onUpdate({ page: Number(e.target.value) })} min={1} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Z-Index</Label>
              <Input type="number" className="h-7 text-xs" value={block.z_index} onChange={(e) => onUpdate({ z_index: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px]">Bloqueado</span>
            <Switch checked={block.is_locked} onCheckedChange={(v) => onUpdate({ is_locked: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px]">Visible</span>
            <Switch checked={block.is_visible} onCheckedChange={(v) => onUpdate({ is_visible: v })} />
          </div>
        </div>

        <Separator />

        {/* Visibility rules */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Visibilidad por Rol
          </p>
          {SIGNER_ROLES.map((role) => {
            const checked = (visibility?.roles || ["titular", "adherente", "contratada"]).includes(role.value);
            return (
              <div key={role.value} className="flex items-center gap-2">
                <Checkbox checked={checked} onCheckedChange={(v) => updateVisibilityRoles(role.value, !!v)} />
                <span className="text-[11px]">{role.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
};

/* ─── Type-specific properties ─── */

function TypeProperties({
  block, content, style, updateContent, updateStyle, templateId, onUpdate,
}: {
  block: TemplateBlock;
  content: any;
  style: any;
  updateContent: (k: string, v: any) => void;
  updateStyle: (k: string, v: any) => void;
  templateId?: string;
  onUpdate: (u: Partial<TemplateBlock>) => void;
}) {
  switch (block.block_type) {
    case "text":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Contenido HTML</Label>
            <Textarea
              value={content.html || ""}
              onChange={(e) => { updateContent("html", e.target.value); updateContent("plain_text", e.target.value.replace(/<[^>]*>/g, "")); }}
              rows={4} className="text-[11px] font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Rol semántico</Label>
            <Select value={content.semantic_role || "paragraph"} onValueChange={(v) => updateContent("semantic_role", v)}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Párrafo</SelectItem>
                <SelectItem value="clause">Cláusula</SelectItem>
                <SelectItem value="legal_note">Nota Legal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Alineación</Label>
            <Select value={style.textAlign || "left"} onValueChange={(v) => updateStyle("textAlign", v)}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
                <SelectItem value="justify">Justificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Tamaño</Label>
              <Input type="number" className="h-7 text-[11px]" value={style.fontSize || 12} onChange={(e) => updateStyle("fontSize", Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Peso</Label>
              <Select value={String(style.fontWeight || 400)} onValueChange={(v) => updateStyle("fontWeight", Number(v))}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light</SelectItem>
                  <SelectItem value="400">Normal</SelectItem>
                  <SelectItem value="600">Semibold</SelectItem>
                  <SelectItem value="700">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

    case "heading":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Texto</Label>
            <Input value={content.text || ""} onChange={(e) => updateContent("text", e.target.value)} className="h-7 text-[11px]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Nivel</Label>
              <Select value={String(content.level || 1)} onValueChange={(v) => updateContent("level", Number(v))}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Alineación</Label>
              <Select value={style.textAlign || "center"} onValueChange={(v) => updateStyle("textAlign", v)}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izq</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Der</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );

    case "signature_block":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Etiqueta</Label>
            <Input value={content.label || ""} onChange={(e) => updateContent("label", e.target.value)} className="h-7 text-[11px]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Rol</Label>
              <Select value={content.signer_role || "titular"} onValueChange={(v) => updateContent("signer_role", v)}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIGNER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Modo</Label>
              <Select value={content.signature_mode || "electronic"} onValueChange={(v) => updateContent("signature_mode", v)}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronic">Electrónica</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Preset</Label>
            <Select value={content.preset || "legal_v2"} onValueChange={(v) => updateContent("preset", v)}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="legal_v1">Legal V1</SelectItem>
                <SelectItem value="legal_v2">Legal V2</SelectItem>
                <SelectItem value="compact">Compacto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium">Mostrar</Label>
            {[
              { key: "show_name", label: "Nombre" },
              { key: "show_dni", label: "C.I." },
              { key: "show_timestamp", label: "Fecha/Hora" },
              { key: "show_ip", label: "IP" },
              { key: "show_method", label: "Método" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-[11px]">{item.label}</span>
                <Switch checked={content[item.key] ?? true} onCheckedChange={(v) => updateContent(item.key, v)} />
              </div>
            ))}
          </div>
        </div>
      );

    case "table":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Fuente de datos</Label>
            <Select value={content.source || "beneficiaries"} onValueChange={(v) => updateContent("source", v)}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beneficiaries">Beneficiarios</SelectItem>
                <SelectItem value="custom">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px]">Encabezado</span>
            <Switch checked={content.header ?? true} onCheckedChange={(v) => updateContent("header", v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px]">Rayas alternas</span>
            <Switch checked={content.striped ?? false} onCheckedChange={(v) => updateContent("striped", v)} />
          </div>
        </div>
      );

    case "attachment_card":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Título</Label>
            <Input value={content.title || ""} onChange={(e) => updateContent("title", e.target.value)} className="h-7 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Descripción</Label>
            <Input value={content.description || ""} onChange={(e) => updateContent("description", e.target.value)} className="h-7 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Modo</Label>
            <Select value={content.display_mode || "card"} onValueChange={(v) => updateContent("display_mode", v)}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="link">Enlace</SelectItem>
                <SelectItem value="preview">Vista previa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px]">Incluir en PDF final</span>
            <Switch checked={content.include_in_final_pdf ?? true} onCheckedChange={(v) => updateContent("include_in_final_pdf", v)} />
          </div>
        </div>
      );

    case "pdf_embed":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Modo de visualización</Label>
            <Select value={content.display_mode || "embedded_pages"} onValueChange={(v) => updateContent("display_mode", v)}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="embedded_pages">Páginas embebidas</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="cover">Portada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px]">Permitir fields encima</span>
            <Switch checked={content.allow_overlay_fields ?? true} onCheckedChange={(v) => updateContent("allow_overlay_fields", v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px]">Reemplazable</span>
            <Switch checked={content.replaceable ?? true} onCheckedChange={(v) => updateContent("replaceable", v)} />
          </div>
        </div>
      );

    case "image":
      return <ImageProperties content={content} updateContent={updateContent} templateId={templateId} onUpdate={onUpdate} block={block} />;

    case "placeholder_chip":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Clave del placeholder</Label>
            <Input value={content.placeholder_key || ""} onChange={(e) => updateContent("placeholder_key", e.target.value)} className="h-7 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Etiqueta</Label>
            <Input value={content.label || ""} onChange={(e) => updateContent("label", e.target.value)} className="h-7 text-[11px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Valor de ejemplo</Label>
            <Input value={content.example_value || ""} onChange={(e) => updateContent("example_value", e.target.value)} className="h-7 text-[11px]" />
          </div>
        </div>
      );

    default:
      return null;
  }
}

/* ─── Image properties with upload/library/URL ─── */

function ImageProperties({
  content, updateContent, templateId, onUpdate, block,
}: {
  content: any;
  updateContent: (k: string, v: any) => void;
  templateId?: string;
  onUpdate: (u: Partial<TemplateBlock>) => void;
  block: TemplateBlock;
}) {
  const { toast } = useToast();
  const [imageTab, setImageTab] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !templateId) return;
    setUploading(true);
    try {
      const path = `template-assets/${templateId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      updateContent("src", urlData.publicUrl);
      updateContent("alt", file.name);
      toast({ title: "Imagen subida" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const opacity = content.opacity ?? 100;

  return (
    <div className="space-y-3">
      {/* Source tabs */}
      <div className="flex gap-1">
        <Button
          type="button" size="sm" variant={imageTab === "upload" ? "default" : "outline"}
          className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => setImageTab("upload")}
        >
          <Upload className="h-3 w-3" />
          Subir
        </Button>
        <Button
          type="button" size="sm" variant={imageTab === "url" ? "default" : "outline"}
          className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => setImageTab("url")}
        >
          <Link className="h-3 w-3" />
          URL
        </Button>
      </div>

      {imageTab === "upload" ? (
        <div className="space-y-2">
          {/* Only render local input when no stable picker is provided */}
          {!onRequestPickImage && (
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileUpload} />
          )}
          <Button
            type="button" variant="outline" size="sm"
            className="w-full h-8 text-[11px] gap-1.5 border-dashed"
            onClick={() => onRequestPickImage ? onRequestPickImage() : fileRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {uploading ? "Subiendo..." : "Elegir archivo"}
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-[11px]">URL de imagen</Label>
          <Input value={content.src || ""} onChange={(e) => updateContent("src", e.target.value)} className="h-7 text-[11px]" placeholder="https://..." />
        </div>
      )}

      {/* Preview */}
      {content.src && (
        <div className="space-y-2">
          <div className="relative rounded-md border overflow-hidden bg-muted/30">
            <img
              src={content.src}
              alt={content.alt || ""}
              className="w-full max-h-32 object-contain"
              style={{ opacity: opacity / 100 }}
            />
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" className="flex-1 h-6 text-[10px] gap-1" onClick={() => onRequestPickImage ? onRequestPickImage() : fileRef?.current?.click()}>
              <Replace className="h-3 w-3" />
              Reemplazar
            </Button>
            <Button type="button" variant="outline" size="sm" className="flex-1 h-6 text-[10px] gap-1 text-destructive" onClick={() => { updateContent("src", ""); updateContent("asset_id", ""); }}>
              <Trash2 className="h-3 w-3" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-[11px]">Texto alternativo</Label>
        <Input value={content.alt || ""} onChange={(e) => updateContent("alt", e.target.value)} className="h-7 text-[11px]" />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px]">Ajuste</Label>
        <Select value={content.fit || "contain"} onValueChange={(v) => updateContent("fit", v)}>
          <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px]">Opacidad ({opacity}%)</Label>
        <Slider value={[opacity]} min={0} max={100} step={5} onValueChange={([v]) => updateContent("opacity", v)} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px]">Usar como fondo</span>
        <Switch checked={content.is_background ?? false} onCheckedChange={(v) => updateContent("is_background", v)} />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px]">Leyenda</Label>
        <Input value={content.caption || ""} onChange={(e) => updateContent("caption", e.target.value)} className="h-7 text-[11px]" placeholder="Pie de imagen" />
      </div>
    </div>
  );
}
