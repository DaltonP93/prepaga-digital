import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search, Plus } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { Tables } from "@/integrations/supabase/types";

type Template = Tables<"templates">;

interface MultiTemplateSelectorProps {
  onSelectionChange?: (templates: Template[]) => void;
  trigger?: React.ReactNode;
}

export const MultiTemplateSelector = ({
  onSelectionChange,
  trigger,
}: MultiTemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { templates, isLoading } = useTemplates();

  const filteredTemplates = templates?.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const toggleTemplate = (template: Template) => {
    const isSelected = selectedTemplates.some((t) => t.id === template.id);
    const newSelected = isSelected
      ? selectedTemplates.filter((t) => t.id !== template.id)
      : [...selectedTemplates, template];
    
    setSelectedTemplates(newSelected);
    onSelectionChange?.(newSelected);
  };

  const defaultTrigger = (
    <Button variant="outline">
      <Plus className="h-4 w-4 mr-2" />
      Seleccionar Templates
      {selectedTemplates.length > 0 && (
        <Badge variant="secondary" className="ml-2">
          {selectedTemplates.length}
        </Badge>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Selector de Multiple Templates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron templates
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedTemplates.some((t) => t.id === template.id)}
                          onCheckedChange={() => toggleTemplate(template)}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-1">
                            {template.template_type}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedTemplates.length} templates seleccionados
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setOpen(false)}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};