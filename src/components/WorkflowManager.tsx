import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitBranch,
  Clock,
  Edit,
  Eye,
  CheckCircle,
  Archive,
} from "lucide-react";
import { useTemplateWorkflow } from "@/hooks/useTemplateWorkflow";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface WorkflowManagerProps {
  templateId: string;
  onStateChange?: (newState: string) => void;
}

const WORKFLOW_STATES = {
  draft: {
    label: "Borrador",
    icon: Edit,
    color: "bg-gray-100 text-gray-600",
    description: "Template en desarrollo",
  },
  in_review: {
    label: "En Revisión",
    icon: Eye,
    color: "bg-yellow-100 text-yellow-600",
    description: "Pendiente de aprobación",
  },
  approved: {
    label: "Aprobado",
    icon: CheckCircle,
    color: "bg-green-100 text-green-600",
    description: "Listo para publicar",
  },
  published: {
    label: "Publicado",
    icon: GitBranch,
    color: "bg-blue-100 text-blue-600",
    description: "Disponible para uso",
  },
  archived: {
    label: "Archivado",
    icon: Archive,
    color: "bg-red-100 text-red-600",
    description: "Fuera de uso",
  },
} as const;

export const WorkflowManager = ({
  templateId,
  onStateChange,
}: WorkflowManagerProps) => {
  const { workflowStates, currentState, isLoadingStates, trackEvent } =
    useTemplateWorkflow(templateId);

  // Use state_name from the database schema
  const currentStateKey =
    (currentState?.state_name as keyof typeof WORKFLOW_STATES) || "draft";
  const currentStateConfig = WORKFLOW_STATES[currentStateKey] || WORKFLOW_STATES.draft;

  if (isLoadingStates) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current State */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Estado del Workflow
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${currentStateConfig.color}`}>
              <currentStateConfig.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{currentStateConfig.label}</h3>
              <p className="text-sm text-muted-foreground">
                {currentStateConfig.description}
              </p>
              {currentState && (
                <p className="text-xs text-muted-foreground mt-1">
                  Orden: {currentState.state_order}
                  {currentState.is_final && " (Estado final)"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow States */}
      {workflowStates && workflowStates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estados del Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-3">
                {workflowStates.map((state, index) => {
                  const stateKey =
                    (state.state_name as keyof typeof WORKFLOW_STATES) ||
                    "draft";
                  const stateConfig =
                    WORKFLOW_STATES[stateKey] || WORKFLOW_STATES.draft;
                  const isLatest = index === workflowStates.length - 1;

                  return (
                    <div key={state.id} className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${stateConfig.color} ${
                          isLatest ? "ring-2 ring-primary ring-offset-2" : ""
                        }`}
                      >
                        <stateConfig.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stateConfig.label}</span>
                          {isLatest && (
                            <Badge variant="secondary" className="text-xs">
                              Actual
                            </Badge>
                          )}
                          {state.is_final && (
                            <Badge variant="outline" className="text-xs">
                              Final
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(state.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!workflowStates || workflowStates.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin estados de workflow</h3>
            <p className="text-muted-foreground">
              Los estados de workflow se configuran para este template
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
