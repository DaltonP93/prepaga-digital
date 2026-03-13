import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2 } from "lucide-react";
import type { TemplateBlock, BlockContent, SignerRole } from "@/types/templateDesigner";

interface BlockPropertyPanelProps {
  block: TemplateBlock | null;
  onUpdate: (updates: Partial<TemplateBlock>) => void;
}

const SIGNER_ROLES: { value: SignerRole; label: string }[] = [
  { value: "titular", label: "Titular" },
  { value: "adherente", label: "Adherente" },
  { value: "contratada", label: "Contratada" },
];

export const BlockPropertyPanel: React.FC<BlockPropertyPanelProps> = ({ block, onUpdate }) => {
  if (!block) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Settings2 className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Seleccioná un bloque para editar sus propiedades
          </p>
        </CardContent>
      </Card>
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
    onUpdate({
      visibility_rules: { ...visibility, roles: newRoles } as any,
    });
  };

  const renderTypeSpecificProperties = () => {
    switch (block.block_type) {
      case "text":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Contenido HTML</Label>
              <Textarea
                value={content.html || ""}
                onChange={(e) => {
                  updateContent("html", e.target.value);
                  updateContent("plain_text", e.target.value.replace(/<[^>]*>/g, ""));
                }}
                rows={4}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rol semántico</Label>
              <Select value={content.semantic_role || "paragraph"} onValueChange={(v) => updateContent("semantic_role", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paragraph">Párrafo</SelectItem>
                  <SelectItem value="clause">Cláusula</SelectItem>
                  <SelectItem value="legal_note">Nota Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alineación</Label>
              <Select value={style.textAlign || "left"} onValueChange={(v) => updateStyle("textAlign", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                <Label className="text-xs">Tamaño</Label>
                <Input type="number" className="h-8 text-xs" value={style.fontSize || 12} onChange={(e) => updateStyle("fontSize", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Peso</Label>
                <Select value={String(style.fontWeight || 400)} onValueChange={(v) => updateStyle("fontWeight", Number(v))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">Light</SelectItem>
                    <SelectItem value="400">Normal</SelectItem>
                    <SelectItem value="500">Medium</SelectItem>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Texto</Label>
              <Input value={content.text || ""} onChange={(e) => updateContent("text", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nivel</Label>
              <Select value={String(content.level || 1)} onValueChange={(v) => updateContent("level", Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1 — Principal</SelectItem>
                  <SelectItem value="2">H2 — Sección</SelectItem>
                  <SelectItem value="3">H3 — Subsección</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alineación</Label>
              <Select value={style.textAlign || "center"} onValueChange={(v) => updateStyle("textAlign", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "signature_block":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Etiqueta</Label>
              <Input value={content.label || ""} onChange={(e) => updateContent("label", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rol firmante</Label>
              <Select value={content.signer_role || "titular"} onValueChange={(v) => updateContent("signer_role", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIGNER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Modo de firma</Label>
              <Select value={content.signature_mode || "electronic"} onValueChange={(v) => updateContent("signature_mode", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronic">Electrónica</SelectItem>
                  <SelectItem value="digital">Digital (canvas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preset visual</Label>
              <Select value={content.preset || "legal_v2"} onValueChange={(v) => updateContent("preset", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="legal_v1">Legal V1</SelectItem>
                  <SelectItem value="legal_v2">Legal V2</SelectItem>
                  <SelectItem value="compact">Compacto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs font-medium">Mostrar</Label>
              {[
                { key: "show_name", label: "Nombre" },
                { key: "show_dni", label: "C.I." },
                { key: "show_timestamp", label: "Fecha/Hora" },
                { key: "show_ip", label: "IP" },
                { key: "show_method", label: "Método" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-xs">{item.label}</span>
                  <Switch
                    checked={content[item.key] ?? true}
                    onCheckedChange={(v) => updateContent(item.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case "table":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fuente de datos</Label>
              <Select value={content.source || "beneficiaries"} onValueChange={(v) => updateContent("source", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beneficiaries">Beneficiarios</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Encabezado</span>
              <Switch checked={content.header ?? true} onCheckedChange={(v) => updateContent("header", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Rayas alternas</span>
              <Switch checked={content.striped ?? false} onCheckedChange={(v) => updateContent("striped", v)} />
            </div>
          </div>
        );

      case "attachment_card":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input value={content.title || ""} onChange={(e) => updateContent("title", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Input value={content.description || ""} onChange={(e) => updateContent("description", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Modo</Label>
              <Select value={content.display_mode || "card"} onValueChange={(v) => updateContent("display_mode", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="link">Enlace</SelectItem>
                  <SelectItem value="preview">Vista previa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Incluir en PDF final</span>
              <Switch checked={content.include_in_final_pdf ?? true} onCheckedChange={(v) => updateContent("include_in_final_pdf", v)} />
            </div>
          </div>
        );

      case "pdf_embed":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Modo de visualización</Label>
              <Select value={content.display_mode || "embedded_pages"} onValueChange={(v) => updateContent("display_mode", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="embedded_pages">Páginas embebidas</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="cover">Portada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Permitir fields encima</span>
              <Switch checked={content.allow_overlay_fields ?? true} onCheckedChange={(v) => updateContent("allow_overlay_fields", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Reemplazable</span>
              <Switch checked={content.replaceable ?? true} onCheckedChange={(v) => updateContent("replaceable", v)} />
            </div>
          </div>
        );

      case "image":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">URL de imagen</Label>
              <Input value={content.src || ""} onChange={(e) => updateContent("src", e.target.value)} className="h-8 text-xs" placeholder="URL o asset_id" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Texto alternativo</Label>
              <Input value={content.alt || ""} onChange={(e) => updateContent("alt", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ajuste</Label>
              <Select value={content.fit || "contain"} onValueChange={(v) => updateContent("fit", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Fondo</span>
              <Switch checked={content.is_background ?? false} onCheckedChange={(v) => updateContent("is_background", v)} />
            </div>
          </div>
        );

      case "placeholder_chip":
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Clave del placeholder</Label>
              <Input value={content.placeholder_key || ""} onChange={(e) => updateContent("placeholder_key", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Etiqueta</Label>
              <Input value={content.label || ""} onChange={(e) => updateContent("label", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor de ejemplo</Label>
              <Input value={content.example_value || ""} onChange={(e) => updateContent("example_value", e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Propiedades</CardTitle>
          <Badge variant="outline" className="text-[10px]">{block.block_type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="px-4 pb-4 space-y-4">
            {/* Type-specific */}
            {renderTypeSpecificProperties()}

            <Separator />

            {/* General props */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">General</Label>
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
                <span className="text-xs">Bloqueado</span>
                <Switch checked={block.is_locked} onCheckedChange={(v) => onUpdate({ is_locked: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Visible</span>
                <Switch checked={block.is_visible} onCheckedChange={(v) => onUpdate({ is_visible: v })} />
              </div>
            </div>

            <Separator />

            {/* Visibility rules */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">Visibilidad por Rol</Label>
              {SIGNER_ROLES.map((role) => {
                const checked = (visibility?.roles || ["titular", "adherente", "contratada"]).includes(role.value);
                return (
                  <div key={role.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => updateVisibilityRoles(role.value, !!v)}
                    />
                    <span className="text-xs">{role.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
