import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Type, 
  Calendar, 
  Hash, 
  ToggleLeft,
  GripVertical,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTemplatePlaceholders } from '@/hooks/useTemplatePlaceholders';

interface DraggablePlaceholdersSidebarProps {
  onPlaceholderInsert: (placeholderName: string) => void;
  dynamicFields: any[];
}

interface PlaceholderItem {
  id: string;
  placeholder_name: string;
  placeholder_label: string;
  placeholder_type: string;
  default_value?: string;
}

export const DraggablePlaceholdersSidebar: React.FC<DraggablePlaceholdersSidebarProps> = ({
  onPlaceholderInsert,
  dynamicFields,
}) => {
  const { placeholders } = useTemplatePlaceholders();
  const [searchTerm, setSearchTerm] = React.useState('');

  const getPlaceholderIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const filteredPlaceholders = placeholders?.filter(placeholder =>
    placeholder.placeholder_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    placeholder.placeholder_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDragStart = (e: React.DragEvent, placeholder: PlaceholderItem) => {
    e.dataTransfer.setData('text/plain', placeholder.placeholder_name);
    e.dataTransfer.setData('application/json', JSON.stringify(placeholder));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getPlaceholderCategory = (name: string) => {
    if (name.includes('CLIENTE')) return 'Cliente';
    if (name.includes('EMPRESA')) return 'Empresa';
    if (name.includes('PLAN')) return 'Plan';
    if (name.includes('FECHA')) return 'Fecha';
    return 'General';
  };

  // Group placeholders by category
  const groupedPlaceholders = filteredPlaceholders.reduce((acc, placeholder) => {
    const category = getPlaceholderCategory(placeholder.placeholder_name);
    if (!acc[category]) acc[category] = [];
    acc[category].push(placeholder);
    return acc;
  }, {} as Record<string, PlaceholderItem[]>);

  return (
    <div className="space-y-4">
      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Campos Disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Grouped Placeholders */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {Object.entries(groupedPlaceholders).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                  {category}
                </h4>
                <div className="space-y-1">
                  {items.map((placeholder) => (
                    <div
                      key={placeholder.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, placeholder)}
                      className="group flex items-center gap-2 p-2 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-all"
                      onClick={() => onPlaceholderInsert(placeholder.placeholder_name)}
                    >
                      <GripVertical className="w-3 h-3 text-gray-400 group-hover:text-primary" />
                      {getPlaceholderIcon(placeholder.placeholder_type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {placeholder.placeholder_label}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {`{${placeholder.placeholder_name}}`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {placeholder.placeholder_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredPlaceholders.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No se encontraron campos' : 'No hay campos disponibles'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inserted Fields Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Campos Insertados ({dynamicFields.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {dynamicFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Arrastra campos al editor o haz clic para insertarlos
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {dynamicFields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between p-2 border rounded-md bg-green-50 border-green-200"
                >
                  <div className="flex items-center gap-2">
                    {getPlaceholderIcon(field.type)}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{field.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {`{${field.name}}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    ✓ Usado
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>💡 Consejos:</strong></p>
            <p>• Arrastra campos al editor</p>
            <p>• Haz clic para insertar rápidamente</p>
            <p>• Usa la búsqueda para encontrar campos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};