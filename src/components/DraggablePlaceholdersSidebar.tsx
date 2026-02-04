
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
  HelpCircle,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  CreditCard,
  ShoppingCart,
  Users
} from 'lucide-react';
import { useTemplatePlaceholders } from '@/hooks/useTemplatePlaceholders';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Variables de base de datos organizadas por categoría
const databaseVariables = [
  {
    category: 'Cliente',
    icon: User,
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    variables: [
      { name: '{{cliente.nombre}}', label: 'Nombre del cliente', type: 'text' },
      { name: '{{cliente.apellido}}', label: 'Apellido del cliente', type: 'text' },
      { name: '{{cliente.email}}', label: 'Email', type: 'text' },
      { name: '{{cliente.telefono}}', label: 'Teléfono', type: 'text' },
      { name: '{{cliente.dni}}', label: 'DNI/Documento', type: 'text' },
      { name: '{{cliente.direccion}}', label: 'Dirección', type: 'text' },
      { name: '{{cliente.fecha_nacimiento}}', label: 'Fecha de nacimiento', type: 'date' },
    ]
  },
  {
    category: 'Plan',
    icon: CreditCard,
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    variables: [
      { name: '{{plan.nombre}}', label: 'Nombre del plan', type: 'text' },
      { name: '{{plan.precio}}', label: 'Precio', type: 'number' },
      { name: '{{plan.descripcion}}', label: 'Descripción', type: 'text' },
      { name: '{{plan.cobertura}}', label: 'Detalles de cobertura', type: 'text' },
      { name: '{{precio_formateado}}', label: 'Precio formateado', type: 'currency' },
    ]
  },
  {
    category: 'Empresa',
    icon: Building2,
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    variables: [
      { name: '{{empresa.nombre}}', label: 'Nombre de la empresa', type: 'text' },
      { name: '{{empresa.email}}', label: 'Email empresa', type: 'text' },
      { name: '{{empresa.telefono}}', label: 'Teléfono empresa', type: 'text' },
      { name: '{{empresa.direccion}}', label: 'Dirección empresa', type: 'text' },
    ]
  },
  {
    category: 'Venta',
    icon: ShoppingCart,
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    variables: [
      { name: '{{venta.fecha}}', label: 'Fecha de la venta', type: 'date' },
      { name: '{{venta.total}}', label: 'Total', type: 'number' },
      { name: '{{venta.vendedor}}', label: 'Vendedor', type: 'text' },
      { name: '{{venta.notas}}', label: 'Notas', type: 'text' },
      { name: '{{total_formateado}}', label: 'Total formateado', type: 'currency' },
    ]
  },
  {
    category: 'Fechas',
    icon: Calendar,
    color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    variables: [
      { name: '{{fecha.actual}}', label: 'Fecha actual', type: 'date' },
      { name: '{{fecha.vencimiento}}', label: 'Fecha de vencimiento', type: 'date' },
    ]
  },
  {
    category: 'Beneficiarios',
    icon: Users,
    color: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
    variables: [
      { name: '{{beneficiarios.lista}}', label: 'Lista de beneficiarios', type: 'list' },
      { name: '{{beneficiarios.total_monto}}', label: 'Total montos beneficiarios', type: 'currency' },
    ]
  },
];

interface DraggablePlaceholdersSidebarProps {
  onPlaceholderInsert: (placeholderName: string) => void;
  dynamicFields: any[];
  templateQuestions?: any[];
  onQuestionInsert?: (question: any) => void;
}

export const DraggablePlaceholdersSidebar: React.FC<DraggablePlaceholdersSidebarProps> = ({
  onPlaceholderInsert,
  dynamicFields,
  templateQuestions = [],
  onQuestionInsert,
}) => {
  const { placeholders } = useTemplatePlaceholders();
  const [dbVariablesOpen, setDbVariablesOpen] = React.useState(true);
  const [placeholdersOpen, setPlaceholdersOpen] = React.useState(false);
  const [questionsOpen, setQuestionsOpen] = React.useState(true);
  const [fieldsOpen, setFieldsOpen] = React.useState(true);
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>({
    'Cliente': true,
    'Plan': true,
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const getPlaceholderIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'currency': return <Hash className="w-4 h-4 text-green-600" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4" />;
      case 'list': return <Users className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'yes_no': return <ToggleLeft className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'select_single': 
      case 'select_multiple': return <HelpCircle className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'yes_no': return 'Sí/No';
      case 'text': return 'Texto';
      case 'number': return 'Número';
      case 'select_single': return 'Selección única';
      case 'select_multiple': return 'Selección múltiple';
      default: return type;
    }
  };

  const handleVariableDragStart = (e: React.DragEvent, variable: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'placeholder',
      placeholder_name: variable.name,
      placeholder_label: variable.label,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handlePlaceholderDragStart = (e: React.DragEvent, placeholder: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'placeholder',
      placeholder_name: placeholder.placeholder_name,
      placeholder_label: placeholder.placeholder_label,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuestionDragStart = (e: React.DragEvent, question: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'question',
      question: question,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="space-y-4">
      {/* Variables de Base de Datos */}
      <Card>
        <Collapsible open={dbVariablesOpen} onOpenChange={setDbVariablesOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">📊 Variables de Base de Datos</CardTitle>
                {dbVariablesOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {databaseVariables.map((group) => (
                <Collapsible 
                  key={group.category} 
                  open={openCategories[group.category]} 
                  onOpenChange={() => toggleCategory(group.category)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${group.color}`}>
                      <group.icon className="h-4 w-4" />
                      <span className="text-sm font-medium flex-1">{group.category}</span>
                      <Badge variant="secondary" className="text-xs">{group.variables.length}</Badge>
                      {openCategories[group.category] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 mt-2 space-y-1">
                      {group.variables.map((variable) => (
                        <div
                          key={variable.name}
                          className="flex items-center gap-2 p-2 border rounded-lg bg-background hover:bg-muted/50 cursor-move text-sm"
                          draggable
                          onDragStart={(e) => handleVariableDragStart(e, variable)}
                          onClick={() => onPlaceholderInsert(variable.name)}
                        >
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                          {getPlaceholderIcon(variable.type)}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{variable.label}</div>
                            <code className="text-[10px] text-muted-foreground">{variable.name}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Placeholders Personalizados del Sistema */}
      <Card>
        <Collapsible open={placeholdersOpen} onOpenChange={setPlaceholdersOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">⚙️ Campos Personalizados</CardTitle>
                {placeholdersOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {placeholders && placeholders.length > 0 ? (
                  placeholders.map((placeholder) => (
                    <div
                      key={placeholder.id}
                      className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30 hover:bg-muted/50 cursor-move"
                      draggable
                      onDragStart={(e) => handlePlaceholderDragStart(e, placeholder)}
                      onClick={() => onPlaceholderInsert(placeholder.placeholder_name)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {getPlaceholderIcon(placeholder.placeholder_type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {placeholder.placeholder_label}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {placeholder.placeholder_name}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {placeholder.placeholder_type}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No hay campos personalizados
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Preguntas del Template */}
      {templateQuestions.length > 0 && (
        <Card>
          <Collapsible open={questionsOpen} onOpenChange={setQuestionsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Preguntas del Template</CardTitle>
                  {questionsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {templateQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-center gap-2 p-2 border rounded-lg bg-blue-50 hover:bg-blue-100 cursor-move"
                      draggable
                      onDragStart={(e) => handleQuestionDragStart(e, question)}
                      onClick={() => onQuestionInsert && onQuestionInsert(question)}
                    >
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      {getQuestionTypeIcon(question.question_type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {index + 1}. {question.question_text}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getQuestionTypeLabel(question.question_type)}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {question.is_required ? 'Obligatoria' : 'Opcional'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Campos Dinámicos Insertados */}
      {dynamicFields.length > 0 && (
        <Card>
          <Collapsible open={fieldsOpen} onOpenChange={setFieldsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Campos Insertados</CardTitle>
                  {fieldsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {dynamicFields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded-lg bg-green-50"
                    >
                      {getPlaceholderIcon(field.type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {field.label}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {field.name}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {field.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Instrucciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600 space-y-2">
            <p>💡 <strong>Arrastra</strong> campos y preguntas al editor</p>
            <p>🖱️ <strong>Haz clic</strong> para insertar en la posición actual</p>
            <p>📝 <strong>Edita</strong> el contenido después de insertar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
