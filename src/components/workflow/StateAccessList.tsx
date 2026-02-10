import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { StateAccessRule, AppRole } from "@/types/workflow";
import { ALL_SALE_STATUSES, SALE_STATUS_LABELS, ALL_ROLES } from "@/types/workflow";
import { ROLE_LABELS } from "@/types/roles";

interface StateAccessListProps {
  stateAccess: StateAccessRule[];
  onChange: (stateAccess: StateAccessRule[]) => void;
}

export function StateAccessList({ stateAccess, onChange }: StateAccessListProps) {
  const getRule = (state: string): StateAccessRule => {
    return (
      stateAccess.find((r) => r.state === state) || {
        state: state as any,
        visible_to: ALL_ROLES,
        editable_by: [],
      }
    );
  };

  const toggleRole = (
    state: string,
    field: "visible_to" | "editable_by",
    role: AppRole
  ) => {
    const current = getRule(state);
    const roles = current[field];
    const updated = roles.includes(role)
      ? roles.filter((r) => r !== role)
      : [...roles, role];

    const newRule = { ...current, [field]: updated };
    const exists = stateAccess.some((r) => r.state === state);
    if (exists) {
      onChange(stateAccess.map((r) => (r.state === state ? newRule : r)));
    } else {
      onChange([...stateAccess, newRule]);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">
        Define que roles pueden ver y editar ventas en cada estado
      </Label>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-2 text-left font-medium">Estado</th>
              {ALL_ROLES.map((role) => (
                <th key={role} className="px-1 py-2 text-center font-medium" title={ROLE_LABELS[role]}>
                  {role === "super_admin" ? "S.Admin" : ROLE_LABELS[role].slice(0, 6)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_SALE_STATUSES.map((state) => {
              const rule = getRule(state);
              return (
                <tr key={state} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">
                    <div className="font-medium">{SALE_STATUS_LABELS[state] || state}</div>
                    <div className="flex gap-3 mt-0.5 text-muted-foreground">
                      <span>Ver</span>
                      <span>Editar</span>
                    </div>
                  </td>
                  {ALL_ROLES.map((role) => (
                    <td key={role} className="px-1 py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Checkbox
                          checked={rule.visible_to.includes(role)}
                          onCheckedChange={() => toggleRole(state, "visible_to", role)}
                          className="h-3.5 w-3.5"
                        />
                        <Checkbox
                          checked={rule.editable_by.includes(role)}
                          onCheckedChange={() => toggleRole(state, "editable_by", role)}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
