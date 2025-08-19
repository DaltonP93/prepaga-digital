import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useRef
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { FileText, Activity, Maximize2, Minimize2, Type, AlignLeft, ChevronDown, Circle, Square, Hash, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EditorToolbar } from './EditorToolbar';
import { DraggablePlaceholdersSidebar } from './DraggablePlaceholdersSidebar';
import { ImageManager } from './ImageManager';
import { useBranding } from './CompanyBrandingProvider';
import { useToast } from '@/hooks/use-toast';

export interface TipTapEditorProps {
  initialContent?: string;
  content?: string;
  onChange?: (html: string) => void;
  onContentChange?: (html: string) => void;
  dynamicFields?: any[];
  onDynamicFieldsChange?: (fields: any[]) => void;
  templateQuestions?: any[];
  templateId?: string;
  showToolbar?: boolean;
  showSidebar?: boolean;
  onReady?: (api: TipTapEditorAPI) => void;
}

export interface TipTapEditorAPI {
  insertSignature: (size?: 'normal' | 'small') => void;
  insertPlaceholder: (name: string) => void;
  insertDropdown: (options?: string[]) => void;
  insertCheckbox: (label?: string) => void;
  insertRadioButton: (options?: string[]) => void;
  insertQRCode: (text?: string) => void;
  insertBarcode: (text?: string) => void;
  insertDynamicQuestion: (type: string, label: string) => void;
  insertText: (text: string) => void;
  addImage: (url?: string) => void;
  getEditor: () => any;
  updateSelectedNodeAttrs: (attrs: any) => void;
  setContent: (content: string) => void;
  getContent: () => string;
  focus: () => void;
}

const DynamicPlaceholder = (window as any).DynamicPlaceholder;
const ResizableImage = (window as any).ResizableImage;
const SignatureField = (window as any).SignatureField;

const TipTapEditor = forwardRef<TipTapEditorAPI, TipTapEditorProps>((props, ref) => {
  const { 
    initialContent, 
    content,
    onChange, 
    onContentChange,
    dynamicFields = [],
    onDynamicFieldsChange,
    templateQuestions = [],
    templateId,
    showToolbar = true,
    showSidebar = true,
    onReady
  } = props;
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showImageManager, setShowImageManager] = useState(false);
  const [stickyToolbar, setStickyToolbar] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { primaryColor } = useBranding();
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: {
          depth: 10,
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }: any) => {
          if (node.type.name === 'heading') {
            return 'Título...';
          }
          return 'Escribe algo...';
        },
      }),
      CharacterCount.configure(),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: 'auto',
            },
            height: {
              default: 'auto',
            },
            borderRadius: {
              default: 0,
            },
            borderWidth: {
              default: 0,
            },
            borderColor: {
              default: primaryColor,
            },
          };
        },
      }).configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow.configure(),
      TableHeader.configure(),
      TableCell.configure(),
      DynamicPlaceholder,
      ResizableImage,
      SignatureField
    ],
    content: content || initialContent || '<p>Escribe algo...</p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      onContentChange?.(html);
    },
  });

  useEffect(() => {
    if (!editor) return;

    editor.commands.extendMarkRange('link');
  }, [editor]);

  useEffect(() => {
    const handleScroll = () => {
      if (!toolbarRef.current) return;
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      setStickyToolbar(toolbarRect.top <= 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const insertSignature = useCallback((size: 'normal' | 'small' = 'normal') => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'signatureField',
      attrs: {
        size: size,
        id: `signature_${Date.now()}`
      }
    }).run();
  }, [editor]);

  const insertPlaceholder = useCallback((name: string) => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'dynamicPlaceholder',
      attrs: {
        name: name,
        id: `placeholder_${Date.now()}`
      }
    }).run();
  }, [editor]);

  const insertDropdown = useCallback((options: string[] = []) => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'dropdown',
      attrs: {
        options: options,
        id: `dropdown_${Date.now()}`
      }
    }).run();
  }, [editor]);

  const insertCheckbox = useCallback((label: string = 'Opción') => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'checkbox',
      attrs: {
        label: label,
        id: `checkbox_${Date.now()}`
      }
    }).run();
  }, [editor]);

  const insertRadioButton = useCallback((options: string[] = []) => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'radioGroup',
      attrs: {
        options: options,
        id: `radio_${Date.now()}`
      }
    }).run();
  }, [editor]);

  const insertQRCode = useCallback((text: string = 'https://docufy.com.py') => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'qrCode',
      attrs: {
        text: text,
        id: `qr_${Date.now()}`
      }
    }).run();
  }, [editor]);

  const insertBarcode = useCallback((text: string = '1234567890') => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'barcode',
      attrs: {
        text: text,
        id: `barcode_${Date.now()}`
      }
    }).run();
  }, [editor]);

  const insertDynamicQuestion = useCallback((type: string = 'text', label: string = 'Nueva pregunta') => {
    if (!editor) return;
    
    const questionNode = {
      type: 'dynamicQuestion',
      attrs: {
        questionType: type,
        label: label,
        required: false,
        placeholder: `Respuesta para: ${label}`,
        id: `question_${Date.now()}`
      }
    };
    
    editor.chain().focus().insertContent(questionNode).run();
  }, [editor]);

  const insertText = useCallback((text: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
  }, [editor]);

  const addImage = useCallback((url: string = '') => {
    if (!editor) return;

    editor.chain().focus().setImage({ src: url }).run();
    setShowImageManager(false);
  }, [editor, setShowImageManager]);

  const updateSelectedNodeAttrs = useCallback((attrs: any) => {
    if (!editor) return;

    Object.entries(attrs).forEach(([key, value]) => {
      editor.commands.updateAttributes('image', { [key]: value });
    });
  }, [editor]);

  const setContent = useCallback((content: string) => {
    if (!editor) return;
    editor.commands.setContent(content);
  }, [editor]);

  const getContent = useCallback(() => {
    return editor?.getHTML() || '';
  }, []);

  useImperativeHandle(ref, () => ({
    insertSignature,
    insertPlaceholder,
    insertDropdown,
    insertCheckbox,
    insertRadioButton,
    insertQRCode,
    insertBarcode,
    insertDynamicQuestion,
    insertText,
    addImage,
    getEditor: () => editor,
    updateSelectedNodeAttrs,
    setContent,
    getContent,
    focus: () => editor?.commands.focus(),
  }), [
    insertSignature, 
    insertPlaceholder, 
    insertDropdown, 
    insertCheckbox, 
    insertRadioButton,
    insertQRCode,
    insertBarcode,
    insertDynamicQuestion,
    insertText,
    addImage,
    updateSelectedNodeAttrs,
    setContent,
    getContent,
    editor
  ]);

  useEffect(() => {
    if (editor && onReady) {
      onReady({
        insertSignature,
        insertPlaceholder,
        insertDropdown,
        insertCheckbox,
        insertRadioButton,
        insertQRCode,
        insertBarcode,
        insertDynamicQuestion,
        insertText,
        addImage,
        getEditor: () => editor,
        updateSelectedNodeAttrs,
        setContent,
        getContent,
        focus: () => editor?.commands.focus(),
      });
    }
  }, [editor, onReady, insertSignature, insertPlaceholder, insertDropdown, insertCheckbox, insertRadioButton, insertQRCode, insertBarcode, insertDynamicQuestion, insertText, addImage, updateSelectedNodeAttrs, setContent, getContent]);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'grid grid-cols-1 lg:grid-cols-4'} gap-6`}>
      <div className={`${isFullscreen ? 'flex-1 flex flex-col' : 'lg:col-span-3'} space-y-4`}>
        <Card className="flex-1">
          {showToolbar && (
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Editor de Plantillas
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Activity className="w-3 h-3" />
                    {editor?.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
          )}

          <CardContent className="space-y-4">
            <div className="border rounded-lg">
              {showToolbar && (
                <div ref={toolbarRef} className={stickyToolbar ? 'sticky top-0 z-10 bg-white border-b' : ''}>
                  <EditorToolbar 
                    editor={editor} 
                    onImageClick={() => setShowImageManager(true)}
                    onSignatureClick={() => insertSignature('normal')}
                    onQuestionClick={() => insertDynamicQuestion('text', 'Nueva pregunta')}
                  />
                  
                  <div className="flex items-center gap-1 p-2 border-b bg-gray-50/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertDynamicQuestion('text', 'Pregunta de texto')}
                      className="gap-2"
                    >
                      <Type className="w-4 h-4" />
                      Texto
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertDynamicQuestion('textarea', 'Pregunta de texto largo')}
                      className="gap-2"
                    >
                      <AlignLeft className="w-4 h-4" />
                      Área de texto
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertDynamicQuestion('select', 'Pregunta de selección')}
                      className="gap-2"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Lista
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertDynamicQuestion('radio', 'Pregunta de opción múltiple')}
                      className="gap-2"
                    >
                      <Circle className="w-4 h-4" />
                      Radio
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertDynamicQuestion('checkbox', 'Pregunta de casillas')}
                      className="gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Checkbox
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="min-h-[400px] p-4">
                <EditorContent 
                  editor={editor} 
                  className="prose prose-sm max-w-none focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {showToolbar && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Type className="w-4 h-4" />
                  <span>{editor?.storage.characterCount?.characters() || 0} caracteres</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{editor?.storage.characterCount?.words() || 0} palabras</span>
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  <span>Línea {editor?.state.selection.$head.pos || 1}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showSidebar && (
        <div className={`${isFullscreen ? 'w-80 border-l' : 'lg:col-span-1'} ${sidebarCollapsed ? 'w-12' : ''}`}>
          <div className="sticky top-4">
            <DraggablePlaceholdersSidebar 
              onPlaceholderInsert={insertPlaceholder}
              dynamicFields={dynamicFields}
              templateQuestions={templateQuestions}
              onQuestionInsert={(question) => insertDynamicQuestion(question.question_type, question.question_text)}
            />
          </div>
        </div>
      )}

      {showImageManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Administrador de Imágenes</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImageManager(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ImageManager onImageSelect={addImage} />
          </div>
        </div>
      )}
    </div>
  );
});

TipTapEditor.displayName = 'TipTapEditor';

export { TipTapEditor as default };
