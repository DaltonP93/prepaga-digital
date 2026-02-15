
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { Badge } from '@/components/ui/badge';

export const DynamicPlaceholderExtension = Node.create({
  name: 'dynamicPlaceholder',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      name: { default: '' },
      id: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-placeholder]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        'data-placeholder': HTMLAttributes.name,
        class: 'inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-mono',
      },
      `{{${HTMLAttributes.name}}}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DynamicPlaceholderComponent);
  },
});

const DynamicPlaceholderComponent = ({ node }: any) => {
  return (
    <NodeViewWrapper as="span" className="inline">
      <Badge variant="secondary" className="font-mono text-xs cursor-default">
        {`{{${node.attrs.name}}}`}
      </Badge>
    </NodeViewWrapper>
  );
};

// ResizableImage is just the Image extension with extra attrs, handled natively
// We export a stub so the import doesn't break
export const ResizableImageExtension = null;

export default DynamicPlaceholderExtension;
