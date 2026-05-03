
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Settings } from 'lucide-react';
import QRCode from 'qrcode';

// Dropdown/Select Extension
export const DropdownExtension = Node.create({
  name: 'dropdown',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      label: { default: 'Seleccionar opción' },
      options: { default: ['Opción 1', 'Opción 2', 'Opción 3'] },
      required: { default: false },
      placeholder: { default: 'Seleccione una opción...' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-dropdown]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-dropdown': 'true',
        class: 'dropdown-field my-4 p-4 border border-gray-300 rounded-lg bg-gray-50',
      },
      [
        'label',
        { class: 'block text-sm font-medium mb-2' },
        HTMLAttributes.label + (HTMLAttributes.required ? ' *' : ''),
      ],
      [
        'select',
        {
          class: 'w-full p-2 border border-gray-300 rounded',
          required: HTMLAttributes.required,
        },
        [
          'option',
          { value: '', disabled: true, selected: true },
          HTMLAttributes.placeholder,
        ],
        ...HTMLAttributes.options.map((option: string) => [
          'option',
          { value: option },
          option,
        ]),
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DropdownComponent);
  },
});

const DropdownComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState<string>(node.attrs.label as string);
  const [options, setOptions] = useState<string[]>(node.attrs.options as string[]);
  const [placeholder, setPlaceholder] = useState<string>(node.attrs.placeholder as string);
  const [required, setRequired] = useState<boolean>(node.attrs.required as boolean);

  const handleSave = () => {
    updateAttributes({
      label,
      options,
      placeholder,
      required,
    });
    setIsEditing(false);
  };

  const addOption = () => {
    setOptions([...options, `Nueva opción ${options.length + 1}`]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_: string, i: number) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <NodeViewWrapper className="dropdown-wrapper">
      <div className="border-2 border-dashed border-blue-300 bg-blue-50 p-4 rounded-lg my-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-blue-600 font-medium text-sm">📋 Lista Desplegable</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="label" className="text-xs">Etiqueta</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="placeholder" className="text-xs">Placeholder</Label>
              <Input
                id="placeholder"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                className="text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs">Opciones</Label>
              <div className="space-y-2">
                {options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="h-6 w-6 p-0 text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Opción
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <Label htmlFor="required" className="text-xs">Campo requerido</Label>
            </div>
            
            <Button onClick={handleSave} size="sm" className="w-full">
              Guardar
            </Button>
          </div>
        ) : (
          <div>
            <Label className="text-sm font-medium">
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Select>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option: string, index: number) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// Checkbox Extension
export const CheckboxExtension = Node.create({
  name: 'checkbox',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      label: { default: 'Opción de checkbox' },
      checked: { default: false },
      required: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-checkbox]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-checkbox': 'true',
        class: 'checkbox-field my-2 p-2 border border-gray-300 rounded bg-gray-50',
      },
      [
        'label',
        { class: 'flex items-center gap-2' },
        [
          'input',
          {
            type: 'checkbox',
            checked: HTMLAttributes.checked,
            required: HTMLAttributes.required,
          },
        ],
        HTMLAttributes.label + (HTMLAttributes.required ? ' *' : ''),
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CheckboxComponent);
  },
});

const CheckboxComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState<string>(node.attrs.label as string);
  const [required, setRequired] = useState<boolean>(node.attrs.required as boolean);

  const handleSave = () => {
    updateAttributes({ label, required });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="checkbox-wrapper">
      <div className="border-2 border-dashed border-green-300 bg-green-50 p-4 rounded-lg my-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-green-600 font-medium text-sm">☑️ Checkbox</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="label" className="text-xs">Etiqueta</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <Label htmlFor="required" className="text-xs">Campo requerido</Label>
            </div>
            
            <Button onClick={handleSave} size="sm" className="w-full">
              Guardar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="preview-checkbox"
              className="h-4 w-4"
            />
            <Label htmlFor="preview-checkbox" className="text-sm">
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// Radio Button Extension
export const RadioButtonExtension = Node.create({
  name: 'radioButton',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      label: { default: 'Pregunta de opción múltiple' },
      options: { default: ['Opción 1', 'Opción 2', 'Opción 3'] },
      required: { default: false },
      name: { default: 'radio_' + Date.now() },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-radio]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-radio': 'true',
        class: 'radio-field my-4 p-4 border border-gray-300 rounded-lg bg-gray-50',
      },
      [
        'label',
        { class: 'block text-sm font-medium mb-2' },
        HTMLAttributes.label + (HTMLAttributes.required ? ' *' : ''),
      ],
      ...HTMLAttributes.options.map((option: string, index: number) => [
        'div',
        { class: 'flex items-center gap-2 mb-2' },
        [
          'input',
          {
            type: 'radio',
            name: HTMLAttributes.name,
            value: option,
            id: `${HTMLAttributes.name}_${index}`,
            required: HTMLAttributes.required,
          },
        ],
        [
          'label',
          { for: `${HTMLAttributes.name}_${index}` },
          option,
        ],
      ]),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RadioButtonComponent);
  },
});

const RadioButtonComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState<string>(node.attrs.label as string);
  const [options, setOptions] = useState<string[]>(node.attrs.options as string[]);
  const [required, setRequired] = useState<boolean>(node.attrs.required as boolean);

  const handleSave = () => {
    updateAttributes({ label, options, required });
    setIsEditing(false);
  };

  const addOption = () => {
    setOptions([...options, `Nueva opción ${options.length + 1}`]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_: string, i: number) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <NodeViewWrapper className="radio-wrapper">
      <div className="border-2 border-dashed border-purple-300 bg-purple-50 p-4 rounded-lg my-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-purple-600 font-medium text-sm">⚪ Radio Buttons</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="label" className="text-xs">Pregunta</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs">Opciones</Label>
              <div className="space-y-2">
                {options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="h-6 w-6 p-0 text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Opción
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <Label htmlFor="required" className="text-xs">Campo requerido</Label>
            </div>
            
            <Button onClick={handleSave} size="sm" className="w-full">
              Guardar
            </Button>
          </div>
        ) : (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-2">
              {options.map((option: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`preview_${node.attrs.name}`}
                    value={option}
                    id={`preview_${node.attrs.name}_${index}`}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`preview_${node.attrs.name}_${index}`} className="text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// QR Code Extension
export const QRCodeExtension = Node.create({
  name: 'qrCode',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      text: { default: 'https://example.com' },
      size: { default: 150 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-qr]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-qr': 'true',
        class: 'qr-code-field my-4 p-4 border border-gray-300 rounded-lg bg-gray-50 text-center',
      },
      [
        'div',
        { class: 'text-sm text-gray-600 mb-2' },
        'Código QR: ' + HTMLAttributes.text,
      ],
      [
        'canvas',
        {
          id: 'qr-canvas-' + Date.now(),
          width: HTMLAttributes.size,
          height: HTMLAttributes.size,
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QRCodeComponent);
  },
});

const QRCodeComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState<string>(node.attrs.text as string);
  const [size, setSize] = useState<number>(node.attrs.size as number);
  const [qrDataUrl, setQrDataUrl] = useState('');

  React.useEffect(() => {
    generateQR();
  }, [text, size]);

  const generateQR = async () => {
    try {
      const url = await QRCode.toDataURL(text, { width: size, margin: 2 });
      setQrDataUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleSave = () => {
    updateAttributes({ text, size });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="qr-wrapper">
      <div className="border-2 border-dashed border-yellow-300 bg-yellow-50 p-4 rounded-lg my-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-yellow-600 font-medium text-sm">📱 Código QR</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="text" className="text-xs">Texto/URL</Label>
              <Input
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="text-sm"
                placeholder="Ingrese el texto o URL"
              />
            </div>
            
            <div>
              <Label htmlFor="size" className="text-xs">Tamaño</Label>
              <Input
                id="size"
                type="number"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="text-sm"
                min="50"
                max="300"
              />
            </div>
            
            <Button onClick={handleSave} size="sm" className="w-full">
              Guardar
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-2">
              {text}
            </div>
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="mx-auto border rounded"
                style={{ width: size, height: size }}
              />
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// Barcode Extension (simplified)
export const BarcodeExtension = Node.create({
  name: 'barcode',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      text: { default: '123456789' },
      type: { default: 'CODE128' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-barcode]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-barcode': 'true',
        class: 'barcode-field my-4 p-4 border border-gray-300 rounded-lg bg-gray-50 text-center',
      },
      [
        'div',
        { class: 'text-sm text-gray-600 mb-2' },
        'Código de Barras: ' + HTMLAttributes.text,
      ],
      [
        'div',
        {
          class: 'barcode-display bg-white p-2 border rounded inline-block',
          style: 'font-family: monospace; font-size: 24px; letter-spacing: 2px;',
        },
        '||||| |||| | ||| |||| |||||',
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BarcodeComponent);
  },
});

const BarcodeComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState<string>(node.attrs.text as string);
  const [type, setType] = useState<string>(node.attrs.type as string);

  const handleSave = () => {
    updateAttributes({ text, type });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="barcode-wrapper">
      <div className="border-2 border-dashed border-orange-300 bg-orange-50 p-4 rounded-lg my-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-orange-600 font-medium text-sm">📊 Código de Barras</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="text" className="text-xs">Texto</Label>
              <Input
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="text-sm"
                placeholder="Ingrese el texto del código"
              />
            </div>
            
            <div>
              <Label htmlFor="type" className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE128">CODE128</SelectItem>
                  <SelectItem value="CODE39">CODE39</SelectItem>
                  <SelectItem value="EAN13">EAN13</SelectItem>
                  <SelectItem value="UPC">UPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleSave} size="sm" className="w-full">
              Guardar
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-2">
              {text} ({type})
            </div>
            <div className="bg-white p-2 border rounded inline-block">
              <div style={{ 
                fontFamily: 'monospace', 
                fontSize: '24px', 
                letterSpacing: '2px',
                lineHeight: '1'
              }}>
                ||||| |||| | ||| |||| |||||
              </div>
              <div className="text-xs mt-1">{text}</div>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
