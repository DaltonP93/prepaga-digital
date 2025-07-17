import React from 'react';
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';

// Question types for dynamic forms
export interface DynamicQuestion {
  id: string;
  type: 'text' | 'select' | 'checkbox' | 'radio' | 'date' | 'number';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  defaultValue?: any;
}

// React component for the question node view
const DynamicQuestionComponent = ({ node, updateAttributes }: any) => {
  const question: DynamicQuestion = node.attrs.question;

  const updateQuestion = (updates: Partial<DynamicQuestion>) => {
    updateAttributes({
      question: { ...question, ...updates }
    });
  };

  return (
    <NodeViewWrapper className="dynamic-question-wrapper">
      <div className="border-2 border-dashed border-purple-300 bg-purple-50 p-4 rounded-lg my-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-600 font-medium text-sm">📝 Pregunta Dinámica</span>
            <select 
              value={question.type}
              onChange={(e) => updateQuestion({ type: e.target.value as any })}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="text">Texto</option>
              <option value="select">Selección</option>
              <option value="checkbox">Checkbox</option>
              <option value="radio">Radio</option>
              <option value="date">Fecha</option>
              <option value="number">Número</option>
            </select>
          </div>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => updateQuestion({ required: e.target.checked })}
            />
            Requerido
          </label>
        </div>
        
        <input
          type="text"
          value={question.label}
          onChange={(e) => updateQuestion({ label: e.target.value })}
          placeholder="Escriba la pregunta..."
          className="w-full text-sm border rounded px-3 py-2 mb-2"
        />
        
        {question.type === 'text' && (
          <input
            type="text"
            value={question.placeholder || ''}
            onChange={(e) => updateQuestion({ placeholder: e.target.value })}
            placeholder="Texto de ayuda..."
            className="w-full text-xs border rounded px-3 py-1 bg-gray-50"
          />
        )}
        
        {(question.type === 'select' || question.type === 'radio') && (
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Opciones (una por línea):</label>
            <textarea
              value={(question.options || []).join('\n')}
              onChange={(e) => updateQuestion({ 
                options: e.target.value.split('\n').filter(o => o.trim()) 
              })}
              placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
              className="w-full text-xs border rounded px-3 py-2 bg-gray-50"
              rows={3}
            />
          </div>
        )}
        
        <div className="text-xs text-purple-600 mt-2">
          ID: {question.id} | Tipo: {question.type}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// TipTap extension for dynamic questions
export const DynamicQuestionExtension = Node.create({
  name: 'dynamicQuestion',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      question: {
        default: {
          id: '',
          type: 'text',
          label: '',
          required: false,
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-dynamic-question]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const question = HTMLAttributes.question;
    return [
      'div',
      {
        'data-dynamic-question': question.id,
        'data-question-type': question.type,
        'data-question-label': question.label,
        'data-question-required': question.required,
        class: 'dynamic-question border-2 border-purple-300 bg-purple-50 p-4 rounded-lg my-4',
      },
      [
        'div',
        { class: 'text-purple-600 font-medium text-sm mb-2' },
        `📝 ${question.label} ${question.required ? '*' : ''}`
      ],
      [
        'div',
        { class: 'text-xs text-purple-500' },
        `Tipo: ${question.type} | ID: ${question.id}`
      ]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DynamicQuestionComponent);
  },

  addCommands() {
    return {
      insertDynamicQuestion: (question: DynamicQuestion) => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: { question },
        });
      },
    } as any;
  },
});