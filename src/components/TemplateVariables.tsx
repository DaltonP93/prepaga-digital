
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Copy, Search } from 'lucide-react';
import { getAvailableVariables } from '@/lib/templateEngine';
import { useToast } from '@/hooks/use-toast';

interface TemplateVariablesProps {
  onVariableSelect?: (variable: string) => void;
}

export const TemplateVariables = ({ onVariableSelect }: TemplateVariablesProps) => {
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const variables = getAvailableVariables();

  const filteredVariables = variables.filter(variable =>
    variable.toLowerCase().includes(search.toLowerCase())
  );

  const copyToClipboard = async (variable: string) => {
    try {
      await navigator.clipboard.writeText(variable);
      toast({
        title: "Copiado",
        description: `Variable ${variable} copiada al portapapeles.`,
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleVariableClick = (variable: string) => {
    if (onVariableSelect) {
      onVariableSelect(variable);
    } else {
      copyToClipboard(variable);
    }
  };

  const getVariableCategory = (variable: string) => {
    if (variable.includes('cliente.')) return 'Cliente';
    if (variable.includes('plan.')) return 'Plan';
    if (variable.includes('empresa.')) return 'Empresa';
    if (variable.includes('venta.')) return 'Venta';
    if (variable.includes('fecha.')) return 'Fecha';
    return 'Especial';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Cliente': return 'bg-blue-100 text-blue-800';
      case 'Plan': return 'bg-green-100 text-green-800';
      case 'Empresa': return 'bg-purple-100 text-purple-800';
      case 'Venta': return 'bg-orange-100 text-orange-800';
      case 'Fecha': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variables de Template</CardTitle>
        <CardDescription>
          Variables disponibles para usar en tus documentos. Haz clic para copiar o seleccionar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredVariables.map((variable) => {
                const category = getVariableCategory(variable);
                return (
                  <div
                    key={variable}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleVariableClick(variable)}
                  >
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {variable}
                      </code>
                      <Badge className={getCategoryColor(category)}>
                        {category}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {filteredVariables.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron variables que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
