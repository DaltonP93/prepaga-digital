
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { Node } from '@tiptap/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  ImageIcon, 
  Type, 
  Calendar, 
  Hash, 
  ToggleLeft,
  PenTool,
  List,
  HelpCircle,
  Save,
  History,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  DropdownMenu,
  CheckSquare,
  RadioButton,
  QrCode,
  Barcode3
} from 'lucide-react';
import { toast } from 'sonner';
import { useTemplatePlaceholders } from '@/hooks/useTemplatePlaceholders';
import { useTemplateVersioning } from '@/hooks/useTemplateVersioning';
import { DraggablePlaceholdersSidebar } from '@/components/DraggablePlaceholdersSidebar';
import { ImageManager } from '@/components/ImageManager';
import { EditorToolbar } from '@/components/EditorToolbar';
import { DynamicQuestionExtension } from '@/components/DynamicQuestionExtension';
import { 
  DropdownExtension, 
  CheckboxExtension, 
  RadioButtonExtension, 
  QRCodeExtension, 
  BarcodeExtension 
} from '@/components/editor/AdvancedExtensions';

// Custom extension for dynamic placeholders
const DynamicPlaceholder = Node.create({
  name: 'dynamicPlaceholder',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      name: { default: '' },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-placeholder]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', {
      'data-placeholder': HTMLAttributes.name,
      'data-label': HTMLAttributes.label,
      class: 'bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-300 font-medium text-sm',
    }, `{${HTMLAttributes.name}}`];
  },

  addNodeView() {
    return ({ node }) => {
      const span = document.createElement('span');
      span.className = 'bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-300 font-medium text-sm cursor-pointer';
      span.textContent = `{${node.attrs.name}}`;
      span.setAttribute('data-placeholder', node.attrs.name);
      span.setAttribute('data-label', node.attrs.label);
      return { dom: span };
    };
  },
});

// Enhanced Image Extension with resize capabilities
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      resizable: { default: true },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', {
      ...HTMLAttributes,
      class: 'resizable-image max-w-full h-auto rounded-lg my-2',
      style: HTMLAttributes.width ? `width: ${HTMLAttributes.width}px; height: auto;` : undefined,
    }];
  },

  addNodeView() {
    return ({ node, updateAttributes }) => {
      const container = document.createElement('div');
      container.className = 'image-container relative inline-block group';
      
      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.className = 'max-w-full h-auto rounded-lg cursor-pointer';
      if (node.attrs.width) {
        img.style.width = `${node.attrs.width}px`;
      }
      
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity';
      
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      
      resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = img.offsetWidth;
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const width = startWidth + (e.clientX - startX);
        const clampedWidth = Math.max(50, Math.min(800, width));
        
        img.style.width = `${clampedWidth}px`;
        updateAttributes({ width: clampedWidth });
      });
      
      document.addEventListener('mouseup', () => {
        isResizing = false;
      });
      
      container.appendChild(img);
      container.appendChild(resizeHandle);
      
      return { dom: container };
    };
  },
});

// Custom extension for signature field
const SignatureField = Node.create({
  name: 'signatureField',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      width: { default: 200 },
      height: { default: 80 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-signature]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', {
      'data-signature': 'true',
      class: 'border-2 border-dashed border-gray-400 bg-gray-50 p-4 text-center rounded-lg my-4',
      style: `width: ${HTMLAttributes.width}px; height: ${HTMLAttributes.height}px;`,
    }, ['p', { class: 'text-gray-600 text-sm m-0' }, 'Campo de Firma']];
  },

  addNodeView() {
    return ({ node }) => {
      const div = document.createElement('div');
      div.className = 'border-2 border-dashed border-gray-400 bg-gray-50 p-4 text-center rounded-lg my-4 cursor-pointer';
      div.style.width = `${node.attrs.width}px`;
      div.style.height = `${node.attrs.height}px`;
      div.setAttribute('data-signature', 'true');
      
      const p = document.createElement('p');
      p.className = 'text-gray-600 text-sm m-0';
      p.textContent = 'Campo de Firma';
      div.appendChild(p);
      
      return { dom: div };
    };
  },
});

interface TipTapEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  dynamicFields: any[];
  onDynamicFieldsChange: (fields: any[]) => void;
  templateQuestions?: any[];
  templateId?: string;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onContentChange,
  dynamicFields,
  onDynamicFieldsChange,
  templateQuestions = [],
  templateId,
}) => {
  const { placeholders } = useTemplatePlaceholders();
  const { versions, createVersion, isCreatingVersion } = useTemplateVersioning(templateId);
  const [showImageManager, setShowImageManager] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stickyToolbar, setStickyToolbar] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Sticky toolbar effect
  useEffect(() => {
    const handleScroll = () => {
      if (toolbarRef.current) {
        const rect = toolbarRef.current.getBoundingClientRect();
        setStickyToolbar(rect.top <= 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Escriba el contenido del documento aquí...',
      }),
      TextStyle,
      DynamicPlaceholder,
      SignatureField,
      DynamicQuestionExtension,
      DropdownExtension,
      CheckboxExtension,
      RadioButtonExtension,
      QRCodeExtension,
      BarcodeExtension,
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);
      updateDynamicFields(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
      },
      handleDrop: (view, event, slice, moved) => {
        const placeholderData = event.dataTransfer?.getData('application/json');
        if (placeholderData) {
          try {
            const data = JSON.parse(placeholderData);
            if (data.type === 'placeholder') {
              insertPlaceholder(data.placeholder_name);
              return true;
            } else if (data.type === 'question') {
              insertSingleQuestion(data.question);
              return true;
            }
          } catch (e) {
            console.error('Error parsing dropped data:', e);
          }
        }
        return false;
      },
    },
  });

  const updateDynamicFields = useCallback((html: string) => {
    const placeholderMatches = html.match(/data-placeholder="([^"]+)"/g) || [];
    const placeholderNames = placeholderMatches.map(match => 
      match.replace(/data-placeholder="([^"]+)"/, '$1')
    );
    
    const newFields = placeholderNames.map(name => {
      const placeholder = placeholders?.find(p => p.placeholder_name === name);
      const existingField = dynamicFields.find(f => f.name === name);
      
      return existingField || {
        name,
        label: placeholder?.placeholder_label || name,
        type: placeholder?.placeholder_type || 'text',
        defaultValue: placeholder?.default_value || '',
        required: true
      };
    });
    
    onDynamicFieldsChange(newFields);
  }, [placeholders, dynamicFields, onDynamicFieldsChange]);

  const insertPlaceholder = useCallback((placeholderName: string) => {
    if (!editor) return;
    
    const placeholder = placeholders?.find(p => p.placeholder_name === placeholderName);
    if (!placeholder) return;

    editor.chain().focus().insertContent({
      type: 'dynamicPlaceholder',
      attrs: {
        name: placeholderName,
        label: placeholder.placeholder_label,
      },
    }).run();
  }, [editor, placeholders]);

  const insertSingleQuestion = useCallback((question: any) => {
    if (!editor) return;
    
    let questionHTML = `<p><strong>${question.question_text}</strong></p>`;
    
    if (question.question_type === 'yes_no') {
      questionHTML += `<p>☐ Sí &nbsp;&nbsp;&nbsp; ☐ No</p>`;
    } else if (question.question_type === 'text') {
      questionHTML += `<p>Respuesta: ________________________</p>`;
    } else if (question.question_type === 'number') {
      questionHTML += `<p>Respuesta: ________________________</p>`;
    } else if (question.question_type === 'select_single' || question.question_type === 'select_multiple') {
      if (question.template_question_options && question.template_question_options.length > 0) {
        question.template_question_options.forEach((option: any) => {
          questionHTML += `<p>☐ ${option.option_text}</p>`;
        });
      }
    }
    
    questionHTML += `<br>`;
    
    editor.chain().focus().insertContent(questionHTML).run();
  }, [editor]);

  const insertAllQuestions = useCallback(() => {
    if (!editor || !templateQuestions || templateQuestions.length === 0) return;

    let questionsHTML = "<h3>Cuestionario</h3>";
    
    templateQuestions.forEach((question, index) => {
      questionsHTML += `<p><strong>${index + 1}. ${question.question_text}</strong></p>`;
      
      if (question.question_type === 'yes_no') {
        questionsHTML += `<p>☐ Sí &nbsp;&nbsp;&nbsp; ☐ No</p>`;
      } else if (question.question_type === 'text') {
        questionsHTML += `<p>Respuesta: ________________________</p>`;
      } else if (question.question_type === 'number') {
        questionsHTML += `<p>Respuesta: ________________________</p>`;
      } else if (question.question_type === 'select_single' || question.question_type === 'select_multiple') {
        if (question.template_question_options && question.template_question_options.length > 0) {
          question.template_question_options.forEach((option: any) => {
            questionsHTML += `<p>☐ ${option.option_text}</p>`;
          });
        }
      }
      
      questionsHTML += `<br>`;
    });

    editor.chain().focus().insertContent(questionsHTML).run();
    toast.success('Preguntas insertadas correctamente');
  }, [editor, templateQuestions]);

  const insertSignature = useCallback(() => {
    if (!editor) return;
    
    editor.chain().focus().insertContent({
      type: 'signatureField',
      attrs: { width: 200, height: 80 },
    }).run();
  }, [editor]);

  const insertDynamicQuestion = useCallback(() => {
    if (!editor) return;
    
    const questionId = `q_${Date.now()}`;
    editor.chain().focus().insertContent({
      type: 'dynamicQuestion',
      attrs: {
        question: {
          id: questionId,
          type: 'text',
          label: 'Nueva pregunta',
          required: false,
        },
      },
    }).run();
  }, [editor]);

  // Advanced insertion functions
  const insertDropdown = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'dropdown',
      attrs: {
        label: 'Seleccionar opción',
        options: ['Opción 1', 'Opción 2', 'Opción 3'],
        required: false,
        placeholder: 'Seleccione una opción...',
      },
    }).run();
  }, [editor]);

  const insertCheckbox = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'checkbox',
      attrs: {
        label: 'Opción de checkbox',
        checked: false,
        required: false,
      },
    }).run();
  }, [editor]);

  const insertRadioButton = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'radioButton',
      attrs: {
        label: 'Pregunta de opción múltiple',
        options: ['Opción 1', 'Opción 2', 'Opción 3'],
        required: false,
        name: 'radio_' + Date.now(),
      },
    }).run();
  }, [editor]);

  const insertQRCode = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'qrCode',
      attrs: {
        text: 'https://example.com',
        size: 150,
      },
    }).run();
  }, [editor]);

  const insertBarcode = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'barcode',
      attrs: {
        text: '123456789',
        type: 'CODE128',
      },
    }).run();
  }, [editor]);

  const saveNewVersion = useCallback(async () => {
    if (!templateId || !editor) return;
    
    const versionNotes = prompt('Notas de la versión (opcional):');
    
    try {
      await createVersion({
        templateId,
        updates: {
          static_content: editor.getHTML(),
          dynamic_fields: dynamicFields,
        },
        versionNotes,
      });
    } catch (error) {
      console.error('Error creating version:', error);
    }
  }, [templateId, editor, dynamicFields, createVersion]);

  const addImage = useCallback((url?: string) => {
    if (!editor) return;
    
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    } else {
      setShowImageManager(true);
    }
  }, [editor]);

  const handleImageSelect = useCallback((url: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run();
      setShowImageManager(false);
      toast.success('Imagen insertada correctamente');
    }
  }, [editor]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'grid grid-cols-1 lg:grid-cols-4'} gap-6`}>
      {/* Editor Principal */}
      <div className={`${isFullscreen ? 'flex-1 flex flex-col' : 'lg:col-span-3'} space-y-4`}>
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Editor de Documento
                {versions.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    v{versions[0]?.version || 1}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {templateId && (
                  <Button
                    onClick={saveNewVersion}
                    variant="outline"
                    size="sm"
                    disabled={isCreatingVersion}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isCreatingVersion ? 'Guardando...' : 'Nueva Versión'}
                  </Button>
                )}
                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  {isFullscreen ? 'Salir' : 'Pantalla Completa'}
                </Button>
                {templateQuestions && templateQuestions.length > 0 && (
                  <Button
                    onClick={insertAllQuestions}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" />
                    Insertar Preguntas
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div
              ref={toolbarRef}
              className={`transition-all duration-200 ${
                stickyToolbar ? 'sticky top-0 z-10 bg-white shadow-md' : ''
              }`}
            >
              <EditorToolbar
                editor={editor}
                onImageClick={() => addImage()}
                onSignatureClick={insertSignature}
                onQuestionClick={insertDynamicQuestion}
              />
              
              {/* Advanced Tools */}
              <div className="flex items-center gap-1 p-2 border-b bg-gray-50/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertDropdown}
                  className="h-8 px-2 text-xs"
                >
                  <DropdownMenu className="h-4 w-4 mr-1" />
                  Lista
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertCheckbox}
                  className="h-8 px-2 text-xs"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Checkbox
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertRadioButton}
                  className="h-8 px-2 text-xs"
                >
                  <RadioButton className="h-4 w-4 mr-1" />
                  Radio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertQRCode}
                  className="h-8 px-2 text-xs"
                >
                  <QrCode className="h-4 w-4 mr-1" />
                  QR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertBarcode}
                  className="h-8 px-2 text-xs"
                >
                  <Barcode3 className="h-4 w-4 mr-1" />
                  Código
                </Button>
              </div>
            </div>
            
            <div className="min-h-[500px] relative border-t flex-1">
              <EditorContent editor={editor} className="h-full" />
              
              <div className="absolute top-4 right-4 text-xs text-muted-foreground bg-white/90 px-3 py-2 rounded-md border shadow-sm">
                💡 Arrastra campos y preguntas desde el panel lateral
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span><strong>Campos:</strong> {dynamicFields.length}</span>
              <span><strong>Preguntas:</strong> {templateQuestions?.length || 0}</span>
              <span><strong>Palabras:</strong> {editor.getText().split(' ').filter(word => word.length > 0).length}</span>
              <span><strong>Caracteres:</strong> {editor.getText().length}</span>
              {versions.length > 0 && (
                <span><strong>Versión:</strong> {versions[0]?.version || 1}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel Lateral */}
      <div className={`${isFullscreen ? 'w-80 border-l' : 'lg:col-span-1'} ${sidebarCollapsed ? 'w-12' : ''}`}>
        <div className="sticky top-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full mb-2"
          >
            {sidebarCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {!sidebarCollapsed && 'Contraer Panel'}
          </Button>
          
          {!sidebarCollapsed && (
            <DraggablePlaceholdersSidebar
              onPlaceholderInsert={insertPlaceholder}
              dynamicFields={dynamicFields}
              templateQuestions={templateQuestions}
              onQuestionInsert={insertSingleQuestion}
            />
          )}
        </div>
      </div>

      {/* Image Manager Modal */}
      {showImageManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Seleccionar Imagen</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowImageManager(false)}
              >
                ✕
              </Button>
            </div>
            <ImageManager onImageSelect={handleImageSelect} />
          </div>
        </div>
      )}
    </div>
  );
};
