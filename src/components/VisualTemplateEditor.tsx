import { useState, useRef, CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Image,
  Table,
  Plus,
  Trash2,
  Eye,
  Code,
  Download,
  Upload,
  Palette,
  Settings,
} from 'lucide-react';
import { getAvailableVariables } from '@/lib/templateEngine';

interface TemplateElement {
  id: string;
  type: 'text' | 'heading' | 'image' | 'table' | 'list' | 'variable' | 'signature';
  content: string;
  styles?: CSSProperties;
  properties?: any;
}

interface VisualTemplateEditorProps {
  initialContent?: any;
  onSave: (content: any) => void;
}

export const VisualTemplateEditor = ({ initialContent, onSave }: VisualTemplateEditorProps) => {
  const [elements, setElements] = useState<TemplateElement[]>(
    initialContent?.elements || []
  );
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableVariables = getAvailableVariables();

  const elementTypes = [
    { type: 'text', label: 'Texto', icon: Type },
    { type: 'heading', label: 'Título', icon: Bold },
    { type: 'image', label: 'Imagen', icon: Image },
    { type: 'table', label: 'Tabla', icon: Table },
    { type: 'list', label: 'Lista', icon: List },
    { type: 'variable', label: 'Variable', icon: Code },
    { type: 'signature', label: 'Firma', icon: Settings },
  ];

  const addElement = (type: string) => {
    const newElement: TemplateElement = {
      id: `element_${Date.now()}`,
      type: type as TemplateElement['type'],
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
    };

    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const getDefaultContent = (type: string): string => {
    switch (type) {
      case 'text':
        return 'Ingrese su texto aquí...';
      case 'heading':
        return 'Título del documento';
      case 'image':
        return 'URL de la imagen';
      case 'table':
        return JSON.stringify({
          headers: ['Columna 1', 'Columna 2'],
          rows: [['Dato 1', 'Dato 2']],
        });
      case 'list':
        return JSON.stringify(['Elemento 1', 'Elemento 2']);
      case 'variable':
        return '{{cliente.nombre}}';
      case 'signature':
        return 'FIRMA DIGITAL';
      default:
        return '';
    }
  };

  const getDefaultStyles = (type: string): CSSProperties => {
    switch (type) {
      case 'heading':
        return {
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: '20px 0',
        };
      case 'text':
        return {
          fontSize: '14px',
          textAlign: 'left',
          margin: '10px 0',
        };
      case 'signature':
        return {
          fontSize: '16px',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: '40px 0',
          padding: '20px',
          backgroundColor: '#f8f9fa',
        };
      default:
        return {};
    }
  };

  const updateElement = (id: string, updates: Partial<TemplateElement>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  };

  const moveElement = (fromIndex: number, toIndex: number) => {
    const newElements = [...elements];
    const [movedElement] = newElements.splice(fromIndex, 1);
    newElements.splice(toIndex, 0, movedElement);
    setElements(newElements);
  };

  const renderElement = (element: TemplateElement, index: number) => {
    const isSelected = selectedElement === element.id;
    
    return (
      <div
        key={element.id}
        className={`
          relative p-3 border rounded-lg cursor-pointer transition-all
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
        `}
        onClick={() => setSelectedElement(element.id)}
        draggable
        onDragStart={() => setDraggedElement(element.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedElement && draggedElement !== element.id) {
            const fromIndex = elements.findIndex(el => el.id === draggedElement);
            moveElement(fromIndex, index);
          }
          setDraggedElement(null);
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="text-xs">
            {element.type}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              deleteElement(element.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        <div style={element.styles}>
          {renderElementContent(element)}
        </div>
      </div>
    );
  };

  const renderElementContent = (element: TemplateElement) => {
    switch (element.type) {
      case 'text':
      case 'heading':
        return <div>{element.content}</div>;
      case 'image':
        return (
          <div className="flex items-center justify-center h-20 bg-gray-100 rounded">
            <Image className="h-8 w-8 text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Imagen</span>
          </div>
        );
      case 'table':
        try {
          const tableData = JSON.parse(element.content);
          return (
            <div className="border rounded">
              <div className="font-semibold bg-gray-50 p-2">
                {tableData.headers?.join(' | ') || 'Tabla'}
              </div>
              {tableData.rows?.slice(0, 2).map((row: string[], idx: number) => (
                <div key={idx} className="p-2 border-t">
                  {row.join(' | ')}
                </div>
              ))}
            </div>
          );
        } catch {
          return <div>Tabla inválida</div>;
        }
      case 'list':
        try {
          const listData = JSON.parse(element.content);
          return (
            <ul className="list-disc list-inside">
              {listData.slice(0, 3).map((item: string, idx: number) => (
                <li key={idx} className="text-sm">{item}</li>
              ))}
            </ul>
          );
        } catch {
          return <div>Lista inválida</div>;
        }
      case 'variable':
        return (
          <Badge variant="secondary" className="font-mono">
            {element.content}
          </Badge>
        );
      case 'signature':
        return (
          <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded">
            {element.content}
          </div>
        );
      default:
        return <div>{element.content}</div>;
    }
  };

  const handleSave = () => {
    const templateContent = {
      elements,
      metadata: {
        version: '2.0',
        created: new Date().toISOString(),
      },
    };
    onSave(templateContent);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (content.elements) {
            setElements(content.elements);
          }
        } catch (error) {
          console.error('Error importing template:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = () => {
    const content = { elements, metadata: { exported: new Date().toISOString() } };
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  return (
    <div className="h-full flex">
      {/* Toolbar */}
      <div className="w-64 border-r bg-gray-50 p-4">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Elementos</h3>
            <div className="grid grid-cols-2 gap-2">
              {elementTypes.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => addElement(type)}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Variables</h3>
            <ScrollArea className="h-40">
              <div className="space-y-1">
                {availableVariables.map((variable) => (
                  <Button
                    key={variable}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start font-mono text-xs"
                    onClick={() => addElement('variable')}
                  >
                    {variable}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex">
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Editor Visual</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                {showCode ? 'Vista' : 'Código'}
              </Button>
              <Button onClick={handleSave}>
                Guardar Template
              </Button>
            </div>
          </div>

          {showCode ? (
            <Textarea
              value={JSON.stringify(elements, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  if (Array.isArray(parsed)) {
                    setElements(parsed);
                  }
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="min-h-96 font-mono text-sm"
            />
          ) : (
            <div className="min-h-96 border rounded-lg p-6 bg-white">
              {elements.length === 0 ? (
                <div className="text-center text-gray-500 py-20">
                  <Type className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Agregue elementos para empezar a diseñar su template</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {elements.map((element, index) => renderElement(element, index))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedElementData && (
          <div className="w-80 border-l bg-gray-50 p-4">
            <h3 className="font-semibold mb-4">Propiedades</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Contenido</label>
                {selectedElementData.type === 'variable' ? (
                  <Select
                    value={selectedElementData.content}
                    onValueChange={(value) => 
                      updateElement(selectedElementData.id, { content: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariables.map((variable) => (
                        <SelectItem key={variable} value={variable}>
                          {variable}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Textarea
                    value={selectedElementData.content}
                    onChange={(e) => 
                      updateElement(selectedElementData.id, { content: e.target.value })
                    }
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Tamaño de fuente</label>
                <Input
                  value={selectedElementData.styles?.fontSize || '14px'}
                  onChange={(e) => 
                    updateElement(selectedElementData.id, {
                      styles: { ...selectedElementData.styles, fontSize: e.target.value }
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Alineación</label>
                <div className="flex gap-1 mt-1">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <Button
                      key={align}
                      size="sm"
                      variant={selectedElementData.styles?.textAlign === align ? 'default' : 'outline'}
                      onClick={() =>
                        updateElement(selectedElementData.id, {
                          styles: { ...selectedElementData.styles, textAlign: align }
                        })
                      }
                    >
                      {align === 'left' && <AlignLeft className="h-4 w-4" />}
                      {align === 'center' && <AlignCenter className="h-4 w-4" />}
                      {align === 'right' && <AlignRight className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Color de texto</label>
                <Input
                  type="color"
                  value={selectedElementData.styles?.color || '#000000'}
                  onChange={(e) =>
                    updateElement(selectedElementData.id, {
                      styles: { ...selectedElementData.styles, color: e.target.value }
                    })
                  }
                  className="mt-1 h-10"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Fondo</label>
                <Input
                  type="color"
                  value={selectedElementData.styles?.backgroundColor || '#ffffff'}
                  onChange={(e) =>
                    updateElement(selectedElementData.id, {
                      styles: { ...selectedElementData.styles, backgroundColor: e.target.value }
                    })
                  }
                  className="mt-1 h-10"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
};