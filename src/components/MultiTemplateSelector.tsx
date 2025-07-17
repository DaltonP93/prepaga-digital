import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";

interface Template {
  id: string;
  name: string;
  template_type?: string;
  question_count?: number;
}

interface MultiTemplateSelectorProps {
  selectedTemplates: string[];
  onTemplatesChange: (templates: string[]) => void;
  templates: Template[];
}

export function MultiTemplateSelector({
  selectedTemplates,
  onTemplatesChange,
  templates
}: MultiTemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleTemplateToggle = (templateId: string) => {
    const newSelection = selectedTemplates.includes(templateId)
      ? selectedTemplates.filter(id => id !== templateId)
      : [...selectedTemplates, templateId];
    
    onTemplatesChange(newSelection);
  };

  const removeTemplate = (templateId: string) => {
    onTemplatesChange(selectedTemplates.filter(id => id !== templateId));
  };

  const selectedTemplateNames = templates
    .filter(t => selectedTemplates.includes(t.id))
    .map(t => t.name);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedTemplates.length === 0
              ? "Seleccionar templates..."
              : `${selectedTemplates.length} template${selectedTemplates.length > 1 ? 's' : ''} seleccionado${selectedTemplates.length > 1 ? 's' : ''}`
            }
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <ScrollArea className="h-64">
            <div className="p-4 space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => handleTemplateToggle(template.id)}
                >
                  <Checkbox
                    checked={selectedTemplates.includes(template.id)}
                    onChange={() => handleTemplateToggle(template.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {template.template_type || 'Sin tipo'} • {template.question_count || 0} preguntas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Selected templates badges */}
      {selectedTemplates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTemplateNames.map((name, index) => (
            <Badge key={selectedTemplates[index]} variant="secondary" className="flex items-center gap-1">
              {name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeTemplate(selectedTemplates[index])}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}