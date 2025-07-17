import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/AuthProvider";

interface SaleNote {
  id: string;
  sale_id: string;
  user_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface SaleNoteFormData {
  note: string;
}

interface SaleNotesProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleNotes({ saleId, open, onOpenChange }: SaleNotesProps) {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SaleNoteFormData>();

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['sale-notes', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_notes')
        .select(`
          *,
          profiles:user_id (
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
    enabled: !!saleId,
  });

  // Create note mutation
  const createNote = useMutation({
    mutationFn: async (data: SaleNoteFormData) => {
      const { error } = await supabase
        .from('sale_notes')
        .insert({
          ...data,
          sale_id: saleId,
          user_id: profile?.id!,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-notes', saleId] });
      toast({
        title: "Novedad agregada",
        description: "La novedad ha sido agregada exitosamente.",
      });
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo agregar la novedad.",
        variant: "destructive",
      });
      console.error('Error creating note:', error);
    },
  });

  const onSubmit = async (data: SaleNoteFormData) => {
    await createNote.mutateAsync(data);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novedades de la Venta</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Comentarios Internos</h3>
              <p className="text-sm text-muted-foreground">
                Registra novedades y comentarios sobre esta venta
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Novedad
            </Button>
          </div>

          {/* Add Note Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Agregar Novedad</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="note">Comentario *</Label>
                    <Textarea
                      id="note"
                      {...register("note", { required: "El comentario es requerido" })}
                      placeholder="Describe la novedad o comentario..."
                      rows={4}
                    />
                    {errors.note && (
                      <span className="text-sm text-red-500">{errors.note.message}</span>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      disabled={createNote.isPending}
                    >
                      {createNote.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Novedades</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Cargando novedades...</div>
              ) : notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={note.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {note.profiles ? 
                              getInitials(note.profiles.first_name, note.profiles.last_name) : 
                              'U'
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">
                                {note.profiles ? 
                                  `${note.profiles.first_name} ${note.profiles.last_name}` : 
                                  'Usuario desconocido'
                                }
                              </span>
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(note.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {note.note}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay novedades registradas
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}