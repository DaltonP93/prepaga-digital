
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotesManagerProps {
  saleId: string;
}

export const NotesManager: React.FC<NotesManagerProps> = ({ saleId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [content, setContent] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_notes')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });

  const createNote = useMutation({
    mutationFn: async (note: any) => {
      const { data, error } = await supabase
        .from('sale_notes')
        .insert(note)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', saleId] });
      toast({ title: "Nota creada", description: "La nota ha sido agregada exitosamente." });
      resetForm();
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('sale_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', saleId] });
      toast({ title: "Nota actualizada", description: "Los cambios han sido guardados exitosamente." });
      resetForm();
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sale_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', saleId] });
      toast({ title: "Nota eliminada", description: "La nota ha sido eliminada exitosamente." });
    },
  });

  const resetForm = () => {
    setContent('');
    setShowForm(false);
    setEditingNote(null);
  };

  const handleEdit = (note: any) => {
    setEditingNote(note);
    setContent(note.note);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const noteData = {
      sale_id: saleId,
      note: content.trim(),
      user_id: supabase.auth.getUser().then(({ data }) => data.user?.id)
    };

    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, note: content.trim() });
    } else {
      createNote.mutate(noteData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta nota?')) {
      deleteNote.mutate(id);
    }
  };

  if (isLoading) {
    return <div>Cargando notas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Notas</CardTitle>
            <CardDescription>
              Gestiona las notas de esta venta
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Nota
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border p-4 rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-4">
              {editingNote ? 'Editar' : 'Nueva'} Nota
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="content">Contenido</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe tu nota aquí..."
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createNote.isPending || updateNote.isPending}>
                  {editingNote ? 'Actualizar' : 'Crear'} Nota
                </Button>
              </div>
            </form>
          </div>
        )}

        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm">{note.note_text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(note)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No hay notas agregadas
          </p>
        )}
      </CardContent>
    </Card>
  );
};
