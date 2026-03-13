import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Globe, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VersionPanelProps {
  templateId: string;
}

interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  content: string;
  designer_version: string;
  layout_snapshot: any;
  version_label: string | null;
  is_published: boolean;
  created_at: string;
  created_by: string | null;
}

export const VersionPanel: React.FC<VersionPanelProps> = ({ templateId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["template-versions", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_versions")
        .select("*")
        .eq("template_id", templateId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as unknown as TemplateVersion[];
    },
    enabled: !!templateId,
  });

  const publishMutation = useMutation({
    mutationFn: async (versionId: string) => {
      // Unpublish all others
      await supabase
        .from("template_versions")
        .update({ is_published: false } as any)
        .eq("template_id", templateId);

      // Publish this one
      const { error: pubErr } = await supabase
        .from("template_versions")
        .update({ is_published: true } as any)
        .eq("id", versionId);
      if (pubErr) throw pubErr;

      // Set published_version_id on templates
      const { error: tplErr } = await supabase
        .from("templates")
        .update({ published_version_id: versionId } as any)
        .eq("id", templateId);
      if (tplErr) throw tplErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-versions", templateId] });
      toast({ title: "Versión publicada" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (version: TemplateVersion) => {
      const { error } = await supabase
        .from("templates")
        .update({ content: version.content } as any)
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Contenido restaurado desde versión anterior" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (versions.length === 0 && !isLoading) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                Versiones
                <Badge variant="secondary" className="text-[10px]">
                  {versions.length}
                </Badge>
              </CardTitle>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="max-h-52">
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">v{v.version_number}</span>
                          {v.version_label && (
                            <span className="text-muted-foreground truncate">
                              — {v.version_label}
                            </span>
                          )}
                          {v.is_published && (
                            <Badge variant="default" className="text-[9px] px-1 gap-0.5">
                              <Globe className="h-2.5 w-2.5" />
                              Publicada
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(v.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!v.is_published && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            disabled={publishMutation.isPending}
                            onClick={() => publishMutation.mutate(v.id)}
                          >
                            <Globe className="h-3 w-3 mr-1" />
                            Publicar
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          disabled={restoreMutation.isPending}
                          onClick={() => restoreMutation.mutate(v)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restaurar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
