import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Type,
  Image,
  FileText,
  User,
  Plus,
  Move,
  Settings,
  Trash2,
} from "lucide-react";

interface TemplateElement {
  id: string;
  type: "text" | "heading" | "image" | "placeholder" | "signature";
  content?: string;
  placeholder?: string;
  level?: number;
}

interface VisualTemplateEditorProps {
  initialElements?: TemplateElement[];
  onElementsChange?: (elements: TemplateElement[]) => void;
}

const ELEMENT_TYPES = [
  { type: "text", label: "Texto", icon: Type },
  { type: "heading", label: "Título", icon: Type },
  { type: "placeholder", label: "Variable", icon: User },
  { type: "signature", label: "Firma", icon: FileText },
];

export const VisualTemplateEditor = ({
  initialElements = [],
  onElementsChange,
}: VisualTemplateEditorProps) => {
  const [elements, setElements] = useState<TemplateElement[]>(initialElements);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newElements = Array.from(elements);
    const [reorderedItem] = newElements.splice(result.source.index, 1);
    newElements.splice(result.destination.index, 0, reorderedItem);
    setElements(newElements);
    onElementsChange?.(newElements);
  };

  const addElement = (type: TemplateElement["type"]) => {
    const newElement: TemplateElement = {
      id: `element-${Date.now()}`,
      type,
      content: type === "text" ? "Nuevo texto" : undefined,
      placeholder: type === "placeholder" ? "client_name" : undefined,
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    onElementsChange?.(newElements);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Elementos</h3>
        {ELEMENT_TYPES.map((elementType) => (
          <Button
            key={elementType.type}
            variant="outline"
            size="sm"
            onClick={() => addElement(elementType.type as TemplateElement["type"])}
            className="w-full justify-start"
          >
            <elementType.icon className="h-4 w-4 mr-2" />
            {elementType.label}
          </Button>
        ))}
      </div>

      <div className="lg:col-span-3">
        <h3 className="font-semibold text-sm mb-4">Diseño del Template</h3>
        {elements.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
            <Plus className="h-8 w-8 mx-auto mb-2" />
            <p>Arrastra elementos aquí para empezar</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="template-elements">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {elements.map((element, index) => (
                    <Draggable key={element.id} draggableId={element.id} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <Card>
                            <CardContent className="p-3 flex items-center gap-2">
                              <div {...provided.dragHandleProps}>
                                <Move className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="flex-1">{element.content || element.placeholder || element.type}</span>
                              <Badge variant="outline">{element.type}</Badge>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};