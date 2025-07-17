import React, { useCallback } from 'react';
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
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  ImageIcon, 
  Type, 
  Calendar, 
  Hash, 
  ToggleLeft,
  PenTool
} from 'lucide-react';
import { useTemplatePlaceholders } from '@/hooks/useTemplatePlaceholders';
import { DraggablePlaceholdersSidebar } from '@/components/DraggablePlaceholdersSidebar';
import { ImageManager } from '@/components/ImageManager';
import { EditorToolbar } from '@/components/EditorToolbar';

// Custom extension for dynamic placeholders
const DynamicPlaceholder = Node.create({
  name: 'dynamicPlaceholder',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      name: {
        default: '',
      },
      label: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-placeholder]',
      },
    ];
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
      return {
        dom: span,
      };
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
      width: {
        default: 200,
      },
      height: {
        default: 80,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-signature]',
      },
    ];
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
      
      return {
        dom: div,
      };
    };
  },
});

interface TipTapEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  dynamicFields: any[];
  onDynamicFieldsChange: (fields: any[]) => void;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onContentChange,
  dynamicFields,
  onDynamicFieldsChange,
}) => {
  const { placeholders } = useTemplatePlaceholders();
  const [showImageManager, setShowImageManager] = React.useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: 'Escriba el contenido del documento aquí...',
      }),
      TextStyle,
      DynamicPlaceholder,
      SignatureField,
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);
      
      // Update dynamic fields based on placeholders in content
      updateDynamicFields(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
      },
      handleDrop: (view, event, slice, moved) => {
        // Handle dropped placeholders
        const placeholderData = event.dataTransfer?.getData('application/json');
        if (placeholderData) {
          try {
            const placeholder = JSON.parse(placeholderData);
            insertPlaceholder(placeholder.placeholder_name);
            return true;
          } catch (e) {
            console.error('Error parsing dropped placeholder:', e);
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

  const insertSignature = useCallback(() => {
    if (!editor) return;
    
    editor.chain().focus().insertContent({
      type: 'signatureField',
      attrs: {
        width: 200,
        height: 80,
      },
    }).run();
  }, [editor]);

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
    }
  }, [editor]);

  const getPlaceholderIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Editor Principal */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Editor de Documento</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Enhanced Toolbar */}
            <EditorToolbar
              editor={editor}
              onImageClick={() => addImage()}
              onSignatureClick={insertSignature}
            />
            
            <div 
              className="min-h-[500px] relative border-t"
              onDrop={(e) => {
                e.preventDefault();
                // Handle drop zone visual feedback
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
            >
              <EditorContent editor={editor} />
              
              {/* Drop Zone Overlay */}
              <div className="absolute top-4 right-4 text-xs text-muted-foreground bg-white/90 px-3 py-2 rounded-md border shadow-sm">
                💡 Arrastra campos desde el panel lateral
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span><strong>Campos:</strong> {dynamicFields.length}</span>
              <span><strong>Palabras:</strong> {editor.getText().split(' ').filter(word => word.length > 0).length}</span>
              <span><strong>Caracteres:</strong> {editor.getText().length}</span>
            </div>
          </CardContent>
        </Card>

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

      {/* Panel Lateral */}
      <div className="lg:col-span-1">
        <DraggablePlaceholdersSidebar
          onPlaceholderInsert={insertPlaceholder}
          dynamicFields={dynamicFields}
        />
      </div>
    </div>
  );
};