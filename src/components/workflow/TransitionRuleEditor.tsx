import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import type { TransitionRule, AppRole } from "@/types/workflow";
import { ALL_SALE_STATUSES, SALE_STATUS_LABELS, ALL_ROLES } from "@/types/workflow";
import { ROLE_LABELS } from "@/types/roles";
import { ConditionEditor } from "./ConditionEditor";

interface TransitionRuleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: TransitionRule | null;
  onSave: (rule: TransitionRule) => void;
}

export function TransitionRuleEditor({ open, onOpenChange, rule, onSave }: TransitionRuleEditorProps) {
  const [from, setFrom] = useState<string>(rule?.from || "borrador");
  const [to, setTo] = useState<string>(rule?.to || "enviado");
  const [allowedRoles, setAllowedRoles] = useState<AppRole[]>(rule?.allowed_roles || []);
  const [conditions, setConditions] = useState(rule?.conditions || []);
  const [requireNote, setRequireNote] = useState(rule?.require_note || false);

  useEffect(() => {
    if (open) {
      setFrom(rule?.from || "borrador");
      setTo(rule?.to || "enviado");
      setAllowedRoles(rule?.allowed_roles || []);
      setConditions(rule?.conditions || []);
      setRequireNote(rule?.require_note || false);
    }
  }, [open, rule]);

  const toggleRole = (role: AppRole) => {
    setAllowedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = () => {
    onSave({
      id: rule?.id || `rule-${Date.now()}`,
      from: from as any,
      to: to as any,
      allowed_roles: allowedRoles,
      conditions,
      require_note: requireNote,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Transicion" : "Nueva Transicion"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From -> To */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Estado origen</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_SALE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SALE_STATUS_LABELS[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="h-5 w-5 mb-2 text-muted-foreground shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Label>Estado destino</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_SALE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SALE_STATUS_LABELS[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allowed roles */}
          <div className="space-y-1.5">
            <Label>Roles autorizados</Label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 rounded border p-2 text-sm cursor-pointer hover:bg-muted"
                >
                  <Checkbox
                    checked={allowedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <span>{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Require note */}
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <Label>Requiere nota</Label>
              <p className="text-xs text-muted-foreground">
                El usuario debe agregar un comentario al cambiar de estado
              </p>
            </div>
            <Switch checked={requireNote} onCheckedChange={setRequireNote} />
          </div>

          {/* Conditions */}
          <div className="space-y-1.5">
            <Label>Condiciones</Label>
            <ConditionEditor conditions={conditions} onChange={setConditions} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={from === to || allowedRoles.length === 0}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
