
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SaleNote {
  id: string;
  note: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

interface SaleNotesProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SaleNotes: React.FC<SaleNotesProps> = ({
  saleId,
  open,
  onOpenChange,
}) => {
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ['sale-notes', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_notes')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SaleNote[];
    },
    enabled: open && !!saleId,
  });

  const addNote = useMutation({
    mutationFn: async (note: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('sale_notes')
        .insert({
          sale_id: saleId,
          note: note.trim(),
          user_id: user.id,
        })
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-notes', saleId] });
      toast.success('Nota agregada correctamente');
      setNewNote('');
      setIsAdding(false);
    },
    onError: (error) => {
      console.error('Error adding note:', error);
      toast.error('Error al agregar nota');
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('sale_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-notes', saleId] });
      toast.success('Nota eliminada correctamente');
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast.error('Error al eliminar nota');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) {
      toast.error('La nota no puede estar vacía');
      return;
    }
    addNote.mutate(newNote);
  };

  const getUserName = (note: SaleNote) => {
    if (note.profiles?.first_name || note.profiles?.last_name) {
      return `${note.profiles.first_name || ''} ${note.profiles.last_name || ''}`.trim();
    }
    return 'Usuario';
  };

  const getUserInitials = (note: SaleNote) => {
    const firstName = note.profiles?.first_name || '';
    const lastName = note.profiles?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Novedades y Notas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botón para agregar nota */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Registra novedades y observaciones importantes sobre esta venta
            </p>
            <Button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Nota
            </Button>
          </div>

          {/* Formulario para nueva nota */}
          {isAdding && (
            <Card>
              <CardHeader>
                <CardTitle>Agregar Nueva Nota</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escribe tu nota aquí..."
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAdding(false);
                        setNewNote('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={addNote.isPending}>
                      {addNote.isPending ? 'Guardando...' : 'Guardar Nota'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de notas */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando notas...</div>
            ) : notes && notes.length > 0 ? (
              notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={note.profiles?.avatar_url} />
                        <AvatarFallback>{getUserInitials(note)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getUserName(note)}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNote.mutate(note.id)}
                            disabled={deleteNote.isPending}
                            className="text-destructive hover:text-destructive h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {note.note}
                        </p>
                        
                        {note.updated_at !== note.created_at && (
                          <p className="text-xs text-muted-foreground">
                            Editado: {new Date(note.updated_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay notas registradas
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
