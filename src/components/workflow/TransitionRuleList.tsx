import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Edit, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import type { TransitionRule } from "@/types/workflow";
import { SALE_STATUS_LABELS } from "@/types/workflow";
import { ROLE_LABELS } from "@/types/roles";
import { TransitionRuleEditor } from "./TransitionRuleEditor";

interface TransitionRuleListProps {
  transitions: TransitionRule[];
  onChange: (transitions: TransitionRule[]) => void;
}

export function TransitionRuleList({ transitions, onChange }: TransitionRuleListProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TransitionRule | null>(null);

  const handleAdd = () => {
    setEditingRule(null);
    setEditorOpen(true);
  };

  const handleEdit = (rule: TransitionRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    onChange(transitions.filter((t) => t.id !== id));
  };

  const handleSave = (rule: TransitionRule) => {
    const exists = transitions.some((t) => t.id === rule.id);
    if (exists) {
      onChange(transitions.map((t) => (t.id === rule.id ? rule : t)));
    } else {
      onChange([...transitions, rule]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {transitions.length} transicion{transitions.length !== 1 ? "es" : ""} configurada{transitions.length !== 1 ? "s" : ""}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {transitions.length === 0 && (
        <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          No hay transiciones configuradas. Agrega una o carga la configuracion por defecto.
        </div>
      )}

      <div className="space-y-2">
        {transitions.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center gap-3 rounded border p-3 hover:bg-muted/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="truncate">{SALE_STATUS_LABELS[rule.from] || rule.from}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{SALE_STATUS_LABELS[rule.to] || rule.to}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {rule.allowed_roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {ROLE_LABELS[role] || role}
                  </Badge>
                ))}
              </div>
              {rule.conditions.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {rule.conditions.length} condicion{rule.conditions.length !== 1 ? "es" : ""}
                  {rule.require_note ? " + nota requerida" : ""}
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleEdit(rule)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => handleDelete(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <TransitionRuleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        rule={editingRule}
        onSave={handleSave}
      />
    </div>
  );
}
