import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useWorkflowConfig, useUpsertWorkflowConfig } from "@/hooks/useWorkflowConfig";
import { TransitionRuleList } from "./TransitionRuleList";
import { StateAccessList } from "./StateAccessList";
import type { WorkflowConfig, TransitionRule, StateAccessRule } from "@/types/workflow";
import { DEFAULT_WORKFLOW_CONFIG } from "@/types/workflow";

interface WorkflowConfigPanelProps {
  companyId: string;
}

export function WorkflowConfigPanel({ companyId }: WorkflowConfigPanelProps) {
  const { data: configRow, isLoading } = useWorkflowConfig(companyId);
  const upsertConfig = useUpsertWorkflowConfig();

  const [isActive, setIsActive] = useState(false);
  const [transitions, setTransitions] = useState<TransitionRule[]>([]);
  const [stateAccess, setStateAccess] = useState<StateAccessRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (configRow) {
      setIsActive(configRow.is_active);
      const config = configRow.workflow_config as WorkflowConfig;
      setTransitions(config?.transitions || []);
      setStateAccess(config?.state_access || []);
    } else {
      setIsActive(false);
      setTransitions([]);
      setStateAccess([]);
    }
    setHasChanges(false);
  }, [configRow]);

  const markChanged = () => setHasChanges(true);

  const handleTransitionsChange = (t: TransitionRule[]) => {
    setTransitions(t);
    markChanged();
  };

  const handleStateAccessChange = (sa: StateAccessRule[]) => {
    setStateAccess(sa);
    markChanged();
  };

  const handleActiveChange = (active: boolean) => {
    setIsActive(active);
    markChanged();
  };

  const handleLoadDefault = () => {
    setTransitions(DEFAULT_WORKFLOW_CONFIG.transitions);
    setStateAccess(DEFAULT_WORKFLOW_CONFIG.state_access);
    markChanged();
    toast.success("Configuracion por defecto cargada");
  };

  const handleSave = async () => {
    const workflowConfig: WorkflowConfig = { transitions, state_access: stateAccess };
    await upsertConfig.mutateAsync({
      companyId,
      workflowConfig,
      isActive,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Cargando configuracion...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Active toggle + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={handleActiveChange} />
          <div>
            <Label className="font-medium">Flujo activo</Label>
            <p className="text-xs text-muted-foreground">
              {isActive
                ? "Las transiciones seran validadas"
                : "Sin validacion (comportamiento por defecto)"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {transitions.length === 0 && (
            <Button type="button" variant="outline" size="sm" onClick={handleLoadDefault}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Cargar por defecto
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || upsertConfig.isPending}
          >
            <Save className="mr-1 h-4 w-4" />
            {upsertConfig.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transitions">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transitions">Transiciones</TabsTrigger>
          <TabsTrigger value="access">Acceso por Estado</TabsTrigger>
        </TabsList>

        <TabsContent value="transitions" className="mt-3">
          <TransitionRuleList transitions={transitions} onChange={handleTransitionsChange} />
        </TabsContent>

        <TabsContent value="access" className="mt-3">
          <StateAccessList stateAccess={stateAccess} onChange={handleStateAccessChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
