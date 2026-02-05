import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Copy, 
  Search, 
  User, 
  Building, 
  FileText, 
  Calendar,
  Users,
  PenTool,
  Package,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { getEnhancedTemplateVariables } from "@/lib/enhancedTemplateEngine";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancedPlaceholdersPanelProps {
  onPlaceholderInsert: (placeholder: string) => void;
  className?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Cliente': <User className="h-4 w-4" />,
  'Plan': <Package className="h-4 w-4" />,
  'Empresa': <Building className="h-4 w-4" />,
  'Venta': <FileText className="h-4 w-4" />,
  'Firma Digital': <PenTool className="h-4 w-4" />,
  'Fecha y Hora': <Calendar className="h-4 w-4" />,
  'Beneficiario Principal': <User className="h-4 w-4" />,
  'Lista de Beneficiarios': <Users className="h-4 w-4" />,
};

export const EnhancedPlaceholdersPanel: React.FC<EnhancedPlaceholdersPanelProps> = ({
  onPlaceholderInsert,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const allVariables = useMemo(() => getEnhancedTemplateVariables(), []);

  const filteredVariables = useMemo(() => {
    if (!searchTerm) return allVariables;
    
    const term = searchTerm.toLowerCase();
    return allVariables
      .map(category => ({
        ...category,
        variables: category.variables.filter(
          v => v.key.toLowerCase().includes(term) || v.description.toLowerCase().includes(term)
        ),
      }))
      .filter(category => category.variables.length > 0);
  }, [allVariables, searchTerm]);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("Variable copiada al portapapeles");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInsert = (key: string) => {
    onPlaceholderInsert(key);
    toast.success("Variable insertada en el editor");
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Variables Dinámicas
        </CardTitle>
        <CardDescription className="text-xs">
          Haz clic para insertar o copiar variables
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar variables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Variables by Category */}
        <ScrollArea className="h-[400px] pr-2">
          <Accordion type="multiple" defaultValue={['Cliente', 'Venta']} className="w-full">
            {filteredVariables.map((category) => (
              <AccordionItem value={category.category} key={category.category}>
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    {categoryIcons[category.category] || <FileText className="h-4 w-4" />}
                    <span>{category.category}</span>
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                      {category.variables.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1.5 pl-1">
                    {category.variables.map((variable) => (
                      <TooltipProvider key={variable.key}>
                        <div className="flex items-center gap-1.5 group">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1.5 px-2 justify-start text-xs font-mono flex-1 truncate hover:bg-primary/10"
                            onClick={() => handleInsert(variable.key)}
                          >
                            <code className="truncate">{variable.key}</code>
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleCopy(variable.key)}
                              >
                                <Copy className={`h-3 w-3 ${copiedKey === variable.key ? 'text-green-500' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[200px]">
                              <p className="text-xs">{variable.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        {/* Help */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium">
            <Info className="h-3.5 w-3.5" />
            <span>Ayuda</span>
          </div>
          <p className="text-muted-foreground">
            Las variables se reemplazan automáticamente con los datos reales al generar el documento.
          </p>
          <p className="text-muted-foreground">
            Usa <code className="bg-background px-1 rounded">{'{{#beneficiarios}}...{{/beneficiarios}}'}</code> para listar todos los beneficiarios.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
