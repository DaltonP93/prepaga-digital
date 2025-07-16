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

  const addImage = useCallback(() => {
    if (!editor) return;
    
    const url = window.prompt('URL de la imagen:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor Principal */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Editor de Documento</CardTitle>
            
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 border-b pb-2">
              <Button
                variant={editor.isActive('bold') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('italic') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant={editor.isActive('underline') ? 'default' : 'outline'}
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={addImage}
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Imagen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertSignature}
              >
                <PenTool className="w-4 h-4 mr-1" />
                Firma
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg min-h-[400px]">
              <EditorContent editor={editor} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel Lateral */}
      <div className="space-y-4">
        {/* Placeholders Disponibles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campos Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {placeholders?.map((placeholder) => (
              <Button
                key={placeholder.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => insertPlaceholder(placeholder.placeholder_name)}
              >
                <div className="flex items-center gap-2">
                  {getPlaceholderIcon(placeholder.placeholder_type)}
                  <span className="truncate">{placeholder.placeholder_label}</span>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Campos Dinámicos Insertados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campos Insertados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dynamicFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay campos insertados. Haga clic en los campos disponibles para agregarlos.
              </p>
            ) : (
              dynamicFields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    {getPlaceholderIcon(field.type)}
                    <div>
                      <div className="text-sm font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {`{${field.name}}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{field.type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Vista Previa Rápida */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estadísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Campos dinámicos:</strong> {dynamicFields.length}</p>
              <p><strong>Palabras:</strong> {editor.getText().split(' ').filter(word => word.length > 0).length}</p>
              <p><strong>Caracteres:</strong> {editor.getText().length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};