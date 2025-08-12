
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DocumentFormProps {
  onSubmit: (documentData: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export const DocumentForm: React.FC<DocumentFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData 
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    document_type: initialData?.document_type || 'contract',
    content: initialData?.content || '',
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('El nombre del documento es requerido');
      return;
    }

    onSubmit({
      ...formData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? 'Editar Documento' : 'Crear Nuevo Documento'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Documento</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ingrese el nombre del documento"
              required
            />
          </div>

          <div>
            <Label htmlFor="document_type">Tipo de Documento</Label>
            <Select 
              value={formData.document_type} 
              onValueChange={(value) => handleChange('document_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="policy">Póliza</SelectItem>
                <SelectItem value="declaration">Declaración</SelectItem>
                <SelectItem value="report">Reporte</SelectItem>
                <SelectItem value="certificate">Certificado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="content">Contenido</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Ingrese el contenido del documento"
              rows={8}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar' : 'Crear'} Documento
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
