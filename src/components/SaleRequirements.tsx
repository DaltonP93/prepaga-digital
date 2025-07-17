import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckCircle, Circle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/AuthProvider";

interface SaleRequirement {
  id: string;
  sale_id: string;
  requirement_name: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface RequirementFormData {
  requirement_name: string;
}

interface SaleRequirementsProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleRequirements({ saleId, open, onOpenChange }: SaleRequirementsProps) {
  const [showForm, setShowForm] = useState(false);
  const [updatingNotes, setUpdatingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RequirementFormData>();

  // Fetch requirements
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['sale-requirements', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_requirements')
        .select(`
          *,
          profiles:completed_by (
            first_name,
            last_name
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SaleRequirement[];
    },
    enabled: !!saleId,
  });

  // Create requirement mutation
  const createRequirement = useMutation({
    mutationFn: async (data: RequirementFormData) => {
      const { error } = await supabase
        .from('sale_requirements')
        .insert({
          ...data,
          sale_id: saleId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-requirements', saleId] });
      toast({
        title: "Requisito agregado",
        description: "El requisito ha sido agregado exitosamente.",
      });
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo agregar el requisito.",
        variant: "destructive",
      });
      console.error('Error creating requirement:', error);
    },
  });

  // Update requirement completion mutation
  const updateRequirement = useMutation({
    mutationFn: async ({ id, is_completed, notes }: { id: string; is_completed: boolean; notes?: string }) => {
      const updateData: any = { is_completed };
      
      if (is_completed) {
        updateData.completed_by = profile?.id;
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_by = null;
        updateData.completed_at = null;
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('sale_requirements')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-requirements', saleId] });
      toast({
        title: "Requisito actualizado",
        description: "El estado del requisito ha sido actualizado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el requisito.",
        variant: "destructive",
      });
      console.error('Error updating requirement:', error);
    },
  });

  // Delete requirement mutation
  const deleteRequirement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sale_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-requirements', saleId] });
      toast({
        title: "Requisito eliminado",
        description: "El requisito ha sido eliminado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el requisito.",
        variant: "destructive",
      });
      console.error('Error deleting requirement:', error);
    },
  });

  const onSubmit = async (data: RequirementFormData) => {
    await createRequirement.mutateAsync(data);
  };

  const handleToggleComplete = (requirement: SaleRequirement) => {
    updateRequirement.mutate({
      id: requirement.id,
      is_completed: !requirement.is_completed,
    });
  };

  const handleUpdateNotes = (requirement: SaleRequirement) => {
    updateRequirement.mutate({
      id: requirement.id,
      is_completed: requirement.is_completed,
      notes: tempNotes,
    });
    setUpdatingNotes(null);
    setTempNotes('');
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este requisito?')) {
      deleteRequirement.mutate(id);
    }
  };

  const startEditingNotes = (requirement: SaleRequirement) => {
    setUpdatingNotes(requirement.id);
    setTempNotes(requirement.notes || '');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const completedCount = requirements.filter(req => req.is_completed).length;
  const totalCount = requirements.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requisitos de la Venta</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Checklist de Requisitos</h3>
              <p className="text-sm text-muted-foreground">
                Progreso: {completedCount} de {totalCount} completados ({completionPercentage}%)
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Requisito
            </Button>
          </div>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          )}

          {/* Add Requirement Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Agregar Requisito</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="requirement_name">Nombre del Requisito *</Label>
                    <Input
                      id="requirement_name"
                      {...register("requirement_name", { required: "El nombre del requisito es requerido" })}
                      placeholder="Ej: Cédula de identidad, Comprobante de ingresos..."
                    />
                    {errors.requirement_name && (
                      <span className="text-sm text-red-500">{errors.requirement_name.message}</span>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      disabled={createRequirement.isPending}
                    >
                      {createRequirement.isPending ? "Guardando..." : "Agregar"}
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

          {/* Requirements List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Requisitos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Cargando requisitos...</div>
              ) : requirements.length > 0 ? (
                <div className="space-y-4">
                  {requirements.map((requirement) => (
                    <div key={requirement.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <button
                            onClick={() => handleToggleComplete(requirement)}
                            className="mt-1"
                          >
                            {requirement.is_completed ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${requirement.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                {requirement.requirement_name}
                              </span>
                              {requirement.is_completed && (
                                <Badge variant="outline" className="text-green-600">
                                  Completado
                                </Badge>
                              )}
                            </div>
                            
                            {requirement.is_completed && requirement.completed_by && (
                              <p className="text-xs text-muted-foreground">
                                Completado por {requirement.profiles?.first_name} {requirement.profiles?.last_name} el {formatDate(requirement.completed_at)}
                              </p>
                            )}
                            
                            {updatingNotes === requirement.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={tempNotes}
                                  onChange={(e) => setTempNotes(e.target.value)}
                                  placeholder="Agregar notas..."
                                  rows={2}
                                />
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleUpdateNotes(requirement)}
                                  >
                                    Guardar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setUpdatingNotes(null)}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {requirement.notes && (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {requirement.notes}
                                  </p>
                                )}
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto text-xs"
                                  onClick={() => startEditingNotes(requirement)}
                                >
                                  {requirement.notes ? 'Editar notas' : 'Agregar notas'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(requirement.id)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay requisitos registrados
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}