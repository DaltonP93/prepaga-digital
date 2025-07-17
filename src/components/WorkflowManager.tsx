import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GitBranch,
  MessageCircle,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Archive,
  Eye,
  Edit,
  Send,
  ArrowRight,
  History,
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

const WORKFLOW_TRANSITIONS = {
  draft: ["in_review"],
  in_review: ["draft", "approved"],
  approved: ["published", "draft"],
  published: ["archived"],
  archived: ["draft"],
} as const;

export const WorkflowManager = ({ templateId, onStateChange }: WorkflowManagerProps) => {
  const {
    workflowStates,
    currentState,
    updateState,
    isUpdatingState,
    trackEvent,
  } = useTemplateWorkflow(templateId);

  const [selectedNewState, setSelectedNewState] = useState<string>("");
  const [transitionNotes, setTransitionNotes] = useState("");
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);

  const currentStateKey = currentState?.state || "draft";
  const currentStateConfig = WORKFLOW_STATES[currentStateKey];
  const availableTransitions = WORKFLOW_TRANSITIONS[currentStateKey] || [];

  const handleStateTransition = () => {
    if (!selectedNewState) return;

    updateState(
      {
        templateId,
        newState: selectedNewState as any,
        notes: transitionNotes,
      },
      {
        onSuccess: () => {
          setShowTransitionDialog(false);
          setSelectedNewState("");
          setTransitionNotes("");
          onStateChange?.(selectedNewState);
          trackEvent({
            templateId,
            eventType: "edit",
            metadata: { action: "state_change", from: currentStateKey, to: selectedNewState },
          });
        },
      }
    );
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

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
            {availableTransitions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransitionDialog(true)}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Cambiar Estado
              </Button>
            )}
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
                  Actualizado {formatDistanceToNow(new Date(currentState.changed_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow History */}
      {workflowStates && workflowStates.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Estados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-3">
                {workflowStates.map((state, index) => {
                  const stateConfig = WORKFLOW_STATES[state.state];
                  const isLatest = index === 0;
                  
                  return (
                    <div key={state.id} className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${stateConfig.color} ${
                        isLatest ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}>
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
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(state.changed_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                          {state.changed_by_profile && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {state.changed_by_profile.first_name} {state.changed_by_profile.last_name}
                              </div>
                            </>
                          )}
                        </div>
                        {state.notes && (
                          <p className="text-sm text-muted-foreground mt-1 bg-muted p-2 rounded">
                            {state.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* State Transition Dialog */}
      <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Template</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Estado actual</label>
              <div className="flex items-center gap-2 mt-1">
                <div className={`p-2 rounded ${currentStateConfig.color}`}>
                  <currentStateConfig.icon className="h-4 w-4" />
                </div>
                <span>{currentStateConfig.label}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Nuevo estado</label>
              <Select value={selectedNewState} onValueChange={setSelectedNewState}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona el nuevo estado" />
                </SelectTrigger>
                <SelectContent>
                  {availableTransitions.map((stateKey) => {
                    const config = WORKFLOW_STATES[stateKey];
                    return (
                      <SelectItem key={stateKey} value={stateKey}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder="Explica el motivo del cambio de estado..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowTransitionDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStateTransition}
              disabled={!selectedNewState || isUpdatingState}
            >
              {isUpdatingState ? (
                "Actualizando..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Cambiar Estado
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};