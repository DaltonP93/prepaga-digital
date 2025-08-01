
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RequirementsManagerProps {
  saleId: string;
}

export const RequirementsManager: React.FC<RequirementsManagerProps> = ({ saleId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [completed, setCompleted] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['requirements', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_requirements')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });

  const createRequirement = useMutation({
    mutationFn: async (requirement: any) => {
      const { data, error } = await supabase
        .from('sale_requirements')
        .insert(requirement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements', saleId] });
      toast({ title: "Requisito creado", description: "El requisito ha sido agregado exitosamente." });
      resetForm();
    },
  });

  const updateRequirement = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('sale_requirements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements', saleId] });
      toast({ title: "Requisito actualizado", description: "Los cambios han sido guardados exitosamente." });
      resetForm();
    },
  });

  const deleteRequirement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sale_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements', saleId] });
      toast({ title: "Requisito eliminado", description: "El requisito ha sido eliminado exitosamente." });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCompleted(false);
    setShowForm(false);
    setEditingRequirement(null);
  };

  const handleEdit = (requirement: any) => {
    setEditingRequirement(requirement);
    setTitle(requirement.title);
    setDescription(requirement.description || '');
    setCompleted(requirement.completed || false);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const requirementData = {
      sale_id: saleId,
      title,
      description,
      completed
    };

    if (editingRequirement) {
      updateRequirement.mutate({ id: editingRequirement.id, ...requirementData });
    } else {
      createRequirement.mutate(requirementData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este requisito?')) {
      deleteRequirement.mutate(id);
    }
  };

  if (isLoading) {
    return <div>Cargando requisitos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Requisitos</CardTitle>
            <CardDescription>
              Gestiona los requisitos de esta venta
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Requisito
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border p-4 rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-4">
              {editingRequirement ? 'Editar' : 'Nuevo'} Requisito
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título del requisito"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción detallada del requisito"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completed"
                  checked={completed}
                  onCheckedChange={setCompleted}
                />
                <Label htmlFor="completed">Completado</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createRequirement.isPending || updateRequirement.isPending}>
                  {editingRequirement ? 'Actualizar' : 'Crear'} Requisito
                </Button>
              </div>
            </form>
          </div>
        )}

        {requirements.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((requirement) => (
                <TableRow key={requirement.id}>
                  <TableCell>{requirement.title}</TableCell>
                  <TableCell>{requirement.description || '-'}</TableCell>
                  <TableCell>
                    {requirement.completed ? (
                      <span className="text-green-600">Completado</span>
                    ) : (
                      <span className="text-yellow-600">Pendiente</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(requirement.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(requirement)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(requirement.id)}
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
            No hay requisitos agregados
          </p>
        )}
      </CardContent>
    </Card>
  );
};
