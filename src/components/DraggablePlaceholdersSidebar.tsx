
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
  ChevronUp
} from 'lucide-react';
import { useTemplatePlaceholders } from '@/hooks/useTemplatePlaceholders';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [placeholdersOpen, setPlaceholdersOpen] = React.useState(true);
  const [questionsOpen, setQuestionsOpen] = React.useState(true);
  const [fieldsOpen, setFieldsOpen] = React.useState(true);

  const getPlaceholderIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4" />;
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
      {/* Placeholders del Sistema */}
      <Card>
        <Collapsible open={placeholdersOpen} onOpenChange={setPlaceholdersOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Campos del Sistema</CardTitle>
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
                {placeholders?.map((placeholder) => (
                  <div
                    key={placeholder.id}
                    className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-move"
                    draggable
                    onDragStart={(e) => handlePlaceholderDragStart(e, placeholder)}
                    onClick={() => onPlaceholderInsert(placeholder.placeholder_name)}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    {getPlaceholderIcon(placeholder.placeholder_type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {placeholder.placeholder_label}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {placeholder.placeholder_name}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {placeholder.placeholder_type}
                    </Badge>
                  </div>
                ))}
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
