import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";
import {
  History,
  GitBranch,
  Tag,
  RotateCcw,
  Plus,
  Clock,
  User,
  Star,
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
    createMajorVersion,
    isCreatingVersion,
    revertToVersion,
    isReverting,
  } = useTemplateVersions(templateId);

  const [showCreateVersionDialog, setShowCreateVersionDialog] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const handleCreateMajorVersion = () => {
    if (!versionNotes.trim()) return;

    createMajorVersion(
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
    revertToVersion(
      { versionId },
      {
        onSuccess: () => {
          setSelectedVersionId(null);
        },
      }
    );
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const latestVersion = versions?.[0];
  const majorVersions = versions?.filter(v => v.is_major_version) || [];
  const minorVersions = versions?.filter(v => !v.is_major_version) || [];

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
            <Dialog open={showCreateVersionDialog} onOpenChange={setShowCreateVersionDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  Crear Versión Major
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Versión Major</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Versión actual: v{latestVersion?.version_number || 1}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      La nueva versión será: v{(latestVersion?.version_number || 0) + 1}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notas de la versión</label>
                    <Textarea
                      value={versionNotes}
                      onChange={(e) => setVersionNotes(e.target.value)}
                      placeholder="Describe los cambios realizados en esta versión..."
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
                      onClick={handleCreateMajorVersion}
                      disabled={!versionNotes.trim() || isCreatingVersion}
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
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {versions?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Versiones
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">
                {majorVersions.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Versiones Major
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {minorVersions.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Versiones Minor
              </div>
            </div>
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
                  const isMajor = version.is_major_version;
                  
                  return (
                    <div
                      key={version.id}
                      className={`flex items-start gap-4 p-3 rounded-lg border ${
                        isLatest ? "bg-primary/5 border-primary/20" : ""
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        isMajor 
                          ? "bg-purple-100 text-purple-600" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {isMajor ? (
                          <Star className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            v{version.version_number}
                          </span>
                          {isMajor && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Major
                            </Badge>
                          )}
                          {isLatest && (
                            <Badge className="text-xs">
                              Actual
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {getInitials(version.user?.first_name, version.user?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {version.user?.first_name} {version.user?.last_name}
                          </span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(version.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                        
                        {version.change_notes && (
                          <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            {version.change_notes}
                          </p>
                        )}
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
                                  Esta acción revertirá el template a la versión v{version.version_number}.
                                  Los cambios actuales se perderán y se creará automáticamente una nueva versión.
                                  ¿Estás seguro de que deseas continuar?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevertToVersion(version.id)}
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

      {/* Version Comparison */}
      {majorVersions.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comparación de Versiones Major</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {majorVersions.slice(0, 3).map((version, index) => (
                <div key={version.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-purple-100 text-purple-600">
                      <Star className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">v{version.version_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(version.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                    </div>
                  </div>
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    {index === 0 ? "Actual" : "Anterior"}
                  </Badge>
                </div>
              ))}
            </div>
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
              Las versiones se crean automáticamente cuando editas el template
            </p>
            <Button onClick={() => setShowCreateVersionDialog(true)}>
              <Tag className="h-4 w-4 mr-2" />
              Crear Primera Versión Major
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};