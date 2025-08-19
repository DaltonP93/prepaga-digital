
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Undo2,
  Redo2,
  Send,
  ZoomIn,
  ZoomOut,
  PenTool,
  Type,
  Calendar,
  CheckSquare,
  Stamp,
  Image as ImageIcon,
  Hash,
  List,
  Circle as RadioIcon,
  Phone,
  Trash2,
  Settings
} from 'lucide-react';
import { TipTapEditor, TipTapEditorAPI } from '@/components/TipTapEditor';
import { toast } from 'sonner';

interface TemplateDesignerProps {
  content: string;
  onContentChange: (content: string) => void;
  dynamicFields: any[];
  onDynamicFieldsChange: (fields: any[]) => void;
  templateQuestions?: any[];
  templateId?: string;
}

interface Tool {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TOOLS: Tool[] = [
  { id: 'signature', label: 'Firma', icon: PenTool, description: 'Campo de firma electrónica' },
  { id: 'initials', label: 'Iniciales', icon: PenTool, description: 'Campo de iniciales' },
  { id: 'text', label: 'Texto', icon: Type, description: 'Campo de texto libre' },
  { id: 'date', label: 'Fecha', icon: Calendar, description: 'Campo de fecha' },
  { id: 'checkbox', label: 'Casilla', icon: CheckSquare, description: 'Casilla de verificación' },
  { id: 'stamp', label: 'Sello', icon: Stamp, description: 'Sello o imagen QR' },
  { id: 'image', label: 'Imagen', icon: ImageIcon, description: 'Insertar imagen' },
  { id: 'number', label: 'Número', icon: Hash, description: 'Campo numérico' },
  { id: 'select', label: 'Select', icon: List, description: 'Lista desplegable' },
  { id: 'radio', label: 'Radio', icon: RadioIcon, description: 'Botones de opción' },
  { id: 'phone', label: 'Teléfono', icon: Phone, description: 'Campo de teléfono' },
];

// Define proper types for properties
interface SignatureProperties {
  width: number;
  height: number;
}

interface TextProperties {
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface ImageProperties {
  width: number;
  height: number;
}

interface CheckboxProperties {
  label: string;
  required: boolean;
}

interface SelectProperties {
  label: string;
  options: string[];
  required: boolean;
}

interface RadioProperties {
  label: string;
  options: string[];
  required: boolean;
}

interface DateProperties {
  label: string;
  format: string;
}

interface PhoneProperties {
  label: string;
  format: string;
}

interface NumberProperties {
  label: string;
  min: number;
  max: number;
}

interface Properties {
  signature: SignatureProperties;
  text: TextProperties;
  image: ImageProperties;
  checkbox: CheckboxProperties;
  select: SelectProperties;
  radio: RadioProperties;
  date: DateProperties;
  phone: PhoneProperties;
  number: NumberProperties;
}

export const TemplateDesigner: React.FC<TemplateDesignerProps> = ({
  content,
  onContentChange,
  dynamicFields,
  onDynamicFieldsChange,
  templateQuestions = [],
  templateId,
}) => {
  const [selectedTool, setSelectedTool] = useState<string>('signature');
  const [zoom, setZoom] = useState(100);
  const [editorAPI, setEditorAPI] = useState<TipTapEditorAPI | null>(null);
  const [properties, setProperties] = useState<Properties>({
    signature: { width: 200, height: 80 },
    text: { fontSize: 12, fontFamily: 'Arial', bold: false, italic: false, underline: false },
    image: { width: 150, height: 150 },
    checkbox: { label: 'Nueva casilla', required: false },
    select: { label: 'Nueva lista', options: ['Opción 1', 'Opción 2'], required: false },
    radio: { label: 'Nueva pregunta', options: ['Opción 1', 'Opción 2'], required: false },
    date: { label: 'Fecha', format: 'dd/mm/yyyy' },
    phone: { label: 'Teléfono', format: '+1 (xxx) xxx-xxxx' },
    number: { label: 'Número', min: 0, max: 100 },
  });

  const handleEditorReady = useCallback((api: TipTapEditorAPI) => {
    setEditorAPI(api);
  }, []);

  const handleToolClick = useCallback((toolId: string) => {
    setSelectedTool(toolId);
    
    if (!editorAPI) {
      toast.error('Editor no está listo');
      return;
    }

    switch (toolId) {
      case 'signature':
        editorAPI.insertSignature('normal');
        break;
      case 'initials':
        editorAPI.insertSignature('small');
        break;
      case 'text':
        editorAPI.insertText('Nuevo texto');
        editorAPI.focus();
        break;
      case 'date':
        editorAPI.insertPlaceholder('current_date');
        break;
      case 'checkbox':
        editorAPI.insertCheckbox(properties.checkbox.label);
        break;
      case 'stamp':
        editorAPI.insertQRCode('https://example.com');
        break;
      case 'image':
        editorAPI.addImage();
        break;
      case 'number':
        editorAPI.insertDynamicQuestion('number');
        break;
      case 'select':
        editorAPI.insertDropdown(properties.select.options);
        break;
      case 'radio':
        editorAPI.insertRadioButton(properties.radio.options);
        break;
      case 'phone':
        editorAPI.insertDynamicQuestion('tel');
        break;
    }
    
    toast.success(`${TOOLS.find(t => t.id === toolId)?.label} insertado`);
  }, [editorAPI, properties]);

  const handleUndo = useCallback(() => {
    if (editorAPI) {
      editorAPI.getEditor()?.commands.undo();
    }
  }, [editorAPI]);

  const handleRedo = useCallback(() => {
    if (editorAPI) {
      editorAPI.getEditor()?.commands.redo();
    }
  }, [editorAPI]);

  const handleSend = useCallback(() => {
    toast.info('Función de envío en desarrollo');
  }, []);

  const handleZoomChange = useCallback((delta: number) => {
    setZoom(prev => Math.max(50, Math.min(200, prev + delta)));
  }, []);

  const updateProperty = useCallback(<T extends keyof Properties, K extends keyof Properties[T]>(
    toolId: T,
    prop: K,
    value: Properties[T][K]
  ) => {
    setProperties(prev => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        [prop]: value
      }
    }));
  }, []);

  // Helper function to get typed properties
  const getPropertiesForTool = <T extends keyof Properties>(toolId: T): Properties[T] => {
    return properties[toolId];
  };
  
  const assignedFields = useMemo(() => {
    const fields = [];
    
    // Count signature fields from content
    const signatureMatches = content.match(/data-signature="true"/g) || [];
    signatureMatches.forEach((_, index) => {
      fields.push({
        type: 'signature',
        label: `Firma ${index + 1}`,
        icon: PenTool
      });
    });

    // Add dynamic fields
    dynamicFields.forEach(field => {
      fields.push({
        type: field.type || 'placeholder',
        label: field.label || field.name,
        icon: Type
      });
    });

    return fields;
  }, [content, dynamicFields]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleUndo}>
              <Undo2 className="h-4 w-4 mr-1" />
              Deshacer
            </Button>
            <Button variant="outline" size="sm" onClick={handleRedo}>
              <Redo2 className="h-4 w-4 mr-1" />
              Rehacer
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Página 1 de 1</span>
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={() => handleZoomChange(-10)}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-12 text-center">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={() => handleZoomChange(10)}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4 mr-1" />
            Enviar
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-64 bg-white shadow-sm border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Herramientas</h2>
            
            <div className="space-y-1">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isSelected = selectedTool === tool.id;
                
                return (
                  <Button
                    key={tool.id}
                    variant={isSelected ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-600'
                    }`}
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    <span>{tool.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Properties Panel */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Propiedades</h3>
            
            {selectedTool === 'signature' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Ancho</Label>
                  <Input
                    type="number"
                    value={getPropertiesForTool('signature').width}
                    onChange={(e) => updateProperty('signature', 'width', parseInt(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Alto</Label>
                  <Input
                    type="number"
                    value={getPropertiesForTool('signature').height}
                    onChange={(e) => updateProperty('signature', 'height', parseInt(e.target.value))}
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {selectedTool === 'text' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Tamaño de fuente</Label>
                  <Select
                    value={getPropertiesForTool('text').fontSize.toString()}
                    onValueChange={(value) => updateProperty('text', 'fontSize', parseInt(value))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="14">14</SelectItem>
                      <SelectItem value="16">16</SelectItem>
                      <SelectItem value="18">18</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={getPropertiesForTool('text').bold ? "default" : "outline"}
                    onClick={() => updateProperty('text', 'bold', !getPropertiesForTool('text').bold)}
                  >
                    <strong>B</strong>
                  </Button>
                  <Button
                    size="sm"
                    variant={getPropertiesForTool('text').italic ? "default" : "outline"}
                    onClick={() => updateProperty('text', 'italic', !getPropertiesForTool('text').italic)}
                  >
                    <em>I</em>
                  </Button>
                  <Button
                    size="sm"
                    variant={getPropertiesForTool('text').underline ? "default" : "outline"}
                    onClick={() => updateProperty('text', 'underline', !getPropertiesForTool('text').underline)}
                  >
                    <u>U</u>
                  </Button>
                </div>
              </div>
            )}

            {selectedTool === 'checkbox' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Etiqueta</Label>
                  <Input
                    value={getPropertiesForTool('checkbox').label}
                    onChange={(e) => updateProperty('checkbox', 'label', e.target.value)}
                    className="h-8"
                    placeholder="Etiqueta de la casilla"
                  />
                </div>
              </div>
            )}

            {selectedTool === 'select' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Etiqueta</Label>
                  <Input
                    value={getPropertiesForTool('select').label}
                    onChange={(e) => updateProperty('select', 'label', e.target.value)}
                    className="h-8"
                    placeholder="Etiqueta de la lista"
                  />
                </div>
                <div>
                  <Label className="text-xs">Opciones (una por línea)</Label>
                  <textarea
                    className="w-full h-20 text-xs border rounded px-2 py-1"
                    value={getPropertiesForTool('select').options.join('\n')}
                    onChange={(e) => updateProperty('select', 'options', e.target.value.split('\n').filter(o => o.trim()))}
                    placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Document Area */}
        <div className="flex-1 p-4 bg-gray-50 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div 
              className="bg-white rounded-lg shadow-lg overflow-hidden"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              <div className="document-preview bg-white relative">
                <div
                  style={{
                    backgroundImage: `linear-gradient(45deg, #f3f4f6 25%, transparent 25%), 
                                     linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), 
                                     linear-gradient(45deg, transparent 75%, #f3f4f6 75%), 
                                     linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                  className="p-8"
                >
                  <TipTapEditor
                    content={content}
                    onContentChange={onContentChange}
                    dynamicFields={dynamicFields}
                    onDynamicFieldsChange={onDynamicFieldsChange}
                    templateQuestions={templateQuestions}
                    templateId={templateId}
                    showToolbar={false}
                    showSidebar={false}
                    onReady={handleEditorReady}
                  />
                </div>
                
                <div className="absolute top-4 right-4 bg-white/90 px-3 py-2 rounded-md border shadow-sm">
                  <p className="text-xs text-gray-500">💡 Selecciona herramientas del panel izquierdo</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Fields */}
        <div className="w-64 bg-white shadow-sm border-l">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Campos</h2>
            
            <div className="space-y-1">
              {TOOLS.slice(0, 7).map((tool) => {
                const Icon = tool.icon;
                
                return (
                  <Button
                    key={`field-${tool.id}`}
                    variant="outline"
                    className="w-full justify-start text-gray-600 border-gray-200"
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <Icon className="h-4 w-4 mr-3 text-blue-600" />
                    <span>{tool.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Campos asignados</h3>
            
            <div className="space-y-2">
              {assignedFields.length === 0 ? (
                <p className="text-xs text-gray-500">No hay campos asignados</p>
              ) : (
                assignedFields.map((field, index) => {
                  const Icon = field.icon;
                  
                  return (
                    <div key={index} className="flex items-center p-2 bg-blue-50 rounded-md">
                      <Icon className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm text-gray-700 flex-1">{field.label}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
