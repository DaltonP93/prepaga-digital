import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus } from "lucide-react";
import { useState } from "react";
import type { TransitionCondition } from "@/types/workflow";
import { BUILT_IN_CONDITIONS } from "@/types/workflow";

interface ConditionEditorProps {
  conditions: TransitionCondition[];
  onChange: (conditions: TransitionCondition[]) => void;
}

export function ConditionEditor({ conditions, onChange }: ConditionEditorProps) {
  const [newCustomLabel, setNewCustomLabel] = useState("");

  const activeBuiltInKeys = conditions
    .filter((c) => c.type === "built_in")
    .map((c) => c.built_in_key);

  const toggleBuiltIn = (key: string, label: string) => {
    if (activeBuiltInKeys.includes(key)) {
      onChange(conditions.filter((c) => !(c.type === "built_in" && c.built_in_key === key)));
    } else {
      onChange([
        ...conditions,
        {
          id: `bi-${key}-${Date.now()}`,
          type: "built_in",
          built_in_key: key,
          label,
        },
      ]);
    }
  };

  const addCustomCondition = () => {
    const label = newCustomLabel.trim();
    if (!label) return;
    onChange([
      ...conditions,
      {
        id: `custom-${Date.now()}`,
        type: "custom",
        label,
      },
    ]);
    setNewCustomLabel("");
  };

  const removeCondition = (id: string) => {
    onChange(conditions.filter((c) => c.id !== id));
  };

  const customConditions = conditions.filter((c) => c.type === "custom");

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Condiciones del sistema</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {BUILT_IN_CONDITIONS.map((bc) => (
            <label
              key={bc.key}
              className="flex items-center gap-2 rounded border p-2 text-sm cursor-pointer hover:bg-muted"
            >
              <Checkbox
                checked={activeBuiltInKeys.includes(bc.key)}
                onCheckedChange={() => toggleBuiltIn(bc.key, bc.label)}
              />
              <span>{bc.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground">Condiciones personalizadas</Label>
        {customConditions.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {customConditions.map((cond) => (
              <div key={cond.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
                <span className="flex-1">{cond.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeCondition(cond.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex gap-2">
          <Input
            value={newCustomLabel}
            onChange={(e) => setNewCustomLabel(e.target.value)}
            placeholder="Ej: Documentos de identidad verificados"
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomCondition();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomCondition}
            disabled={!newCustomLabel.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
