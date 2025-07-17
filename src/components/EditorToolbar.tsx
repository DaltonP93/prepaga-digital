import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  ImageIcon,
  PenTool,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';
import { Editor } from '@tiptap/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EditorToolbarProps {
  editor: Editor;
  onImageClick: () => void;
  onSignatureClick: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onImageClick,
  onSignatureClick,
}) => {
  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    tooltip 
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    tooltip: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50/50">
        {/* History */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            tooltip="Título 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            tooltip="Título 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            tooltip="Título 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Formatting */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Negrita (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Cursiva (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="Subrayado (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            tooltip="Tachado"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="Lista con viñetas"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="Lista numerada"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment - Removed as extension needs proper setup */}
        {/* 
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            tooltip="Alinear izquierda"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            tooltip="Centrar"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            tooltip="Alinear derecha"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />
        */}

        {/* Special Elements */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            tooltip="Cita"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            tooltip="Código"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Media & Special */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={onImageClick}
            tooltip="Insertar imagen"
          >
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={onSignatureClick}
            tooltip="Campo de firma"
          >
            <PenTool className="w-4 h-4" />
          </ToolbarButton>
        </div>
      </div>
    </TooltipProvider>
  );
};