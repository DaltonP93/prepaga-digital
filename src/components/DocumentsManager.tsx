
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Download } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';

interface DocumentsManagerProps {
  saleId: string;
}

export const DocumentsManager: React.FC<DocumentsManagerProps> = ({ saleId }) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { documents, isLoading, createDocument, deleteDocument, isCreating, isDeleting } = useDocuments();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !file) return;

    createDocument({
      sale_id: saleId,
      name,
      document_type: file.type,
      content: '',
      file_url: '',
    });

    setName('');
    setFile(null);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este documento?')) {
      deleteDocument(id);
    }
  };

  if (isLoading) {
    return <div>Cargando documentos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>
              Gestiona los documentos de esta venta
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Documento
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border p-4 rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-4">Nuevo Documento</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Documento</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del documento"
                  required
                />
              </div>
              <div>
                <Label htmlFor="file">Archivo</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  Subir Documento
                </Button>
              </div>
            </form>
          </div>
        )}

        {documents && documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>{document.name}</TableCell>
                  <TableCell>{document.document_type}</TableCell>
                  <TableCell>
                    {new Date(document.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(document.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No hay documentos subidos
          </p>
        )}
      </CardContent>
    </Card>
  );
};
