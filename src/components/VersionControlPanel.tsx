import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  GitBranch,
  Tag,
  RotateCcw,
  Clock,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useTemplateVersions } from "@/hooks/useTemplateWorkflow";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface VersionControlPanelProps {
  templateId: string;
}

export const VersionControlPanel = ({ templateId }: VersionControlPanelProps) => {
  const {
    versions,
    createVersion,
    isCreatingVersion,
    revertToVersion,
    isReverting,
  } = useTemplateVersions(templateId);

  const [showCreateVersionDialog, setShowCreateVersionDialog] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");

  const handleCreateVersion = () => {
    createVersion(
      { templateId, changeNotes: versionNotes },
      {
        onSuccess: () => {
          setShowCreateVersionDialog(false);
          setVersionNotes("");
        },
      }
    );
  };

  const handleRevertToVersion = (versionId: string) => {
    revertToVersion({ versionId });
  };

  const latestVersion = versions?.[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Control de Versiones
              <Badge variant="secondary" className="ml-2">
                v{latestVersion?.version_number || 1}
              </Badge>
            </CardTitle>
            <Dialog
              open={showCreateVersionDialog}
              onOpenChange={setShowCreateVersionDialog}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  Crear Versión
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Versión</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Versión actual: v{latestVersion?.version_number || 1}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      La nueva versión será: v
                      {(latestVersion?.version_number || 0) + 1}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Notas de la versión (opcional)
                    </label>
                    <Textarea
                      value={versionNotes}
                      onChange={(e) => setVersionNotes(e.target.value)}
                      placeholder="Describe los cambios realizados..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateVersionDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateVersion}
                      disabled={isCreatingVersion}
                    >
                      {isCreatingVersion ? (
                        "Creando..."
                      ) : (
                        <>
                          <Tag className="h-4 w-4 mr-2" />
                          Crear Versión
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {versions?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Versiones</div>
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      {versions && versions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Historial de Versiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {versions.map((version, index) => {
                  const isLatest = index === 0;

                  return (
                    <div
                      key={version.id}
                      className={`flex items-start gap-4 p-3 rounded-lg border ${
                        isLatest ? "bg-primary/5 border-primary/20" : ""
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                        <FileText className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            v{version.version_number}
                          </span>
                          {isLatest && (
                            <Badge className="text-xs">Actual</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(version.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isLatest && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Revertir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                                  Revertir a Versión v{version.version_number}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción revertirá el template a la versión
                                  v{version.version_number}. Los cambios
                                  actuales se perderán.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleRevertToVersion(version.id)
                                  }
                                  disabled={isReverting}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  {isReverting ? "Revirtiendo..." : "Revertir"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Empty State */}
      {(!versions || versions.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin versiones</h3>
            <p className="text-muted-foreground mb-4">
              Las versiones se crean cuando guardas cambios en el template
            </p>
            <Button onClick={() => setShowCreateVersionDialog(true)}>
              <Tag className="h-4 w-4 mr-2" />
              Crear Primera Versión
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
