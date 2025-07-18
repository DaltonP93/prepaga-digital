
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Plus, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SaleRequirement {
  id: string;
  requirement_name: string;
  is_completed: boolean;
  notes?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
}

interface SaleRequirementsProps {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SaleRequirements: React.FC<SaleRequirementsProps> = ({
  saleId,
  open,
  onOpenChange,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    requirement_name: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: requirements, isLoading } = useQuery({
    queryKey: ['sale-requirements', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_requirements')
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SaleRequirement[];
    },
    enabled: open && !!saleId,
  });

  const addRequirement = useMutation({
    mutationFn: async (requirement: { requirement_name: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('sale_requirements')
        .insert({
          sale_id: saleId,
          requirement_name: requirement.requirement_name,
          notes: requirement.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-requirements', saleId] });
      toast.success('Requisito agregado correctamente');
      setFormData({ requirement_name: '', notes: '' });
      setIsAdding(false);
    },
    onError: (error) => {
      console.error('Error adding requirement:', error);
      toast.error('Error al agregar requisito');
    },
  });

  const toggleRequirement = useMutation({
    mutationFn: async ({ requirementId, isCompleted }: { requirementId: string; isCompleted: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const updateData: any = {
        is_completed: isCompleted,
      };

      if (isCompleted) {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user.id;
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { data, error } = await supabase
        .from('sale_requirements')
        .update(updateData)
        .eq('id', requirementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-requirements', saleId] });
    },
    onError: (error) => {
      console.error('Error updating requirement:', error);
      toast.error('Error al actualizar requisito');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requirement_name.trim()) {
      toast.error('El nombre del requisito es obligatorio');
      return;
    }
    addRequirement.mutate(formData);
  };

  const getCompletionPercentage = () => {
    if (!requirements || requirements.length === 0) return 0;
    const completed = requirements.filter(r => r.is_completed).length;
    return Math.round((completed / requirements.length) * 100);
  };

  const defaultRequirements = [
    'Documento de Identidad',
    'Comprobante de Ingresos',
    'Constancia de Trabajo',
    'Comprobante de Domicilio',
    'Certificado Médico',
    'Declaración Jurada',
    'Formulario de Beneficiarios',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Control de Requisitos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Barra de progreso */}
          {requirements && requirements.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progreso de Requisitos</span>
                  <span className="text-sm text-muted-foreground">
                    {requirements.filter(r => r.is_completed).length} de {requirements.length} completados
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${getCompletionPercentage()}%` }}
                  />
                </div>
                <div className="text-center mt-2">
                  <span className="text-lg font-bold">{getCompletionPercentage()}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botón para agregar requisito */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Controla el cumplimiento de requisitos para esta venta
            </p>
            <Button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar Requisito
            </Button>
          </div>

          {/* Formulario para nuevo requisito */}
          {isAdding && (
            <Card>
              <CardHeader>
                <CardTitle>Nuevo Requisito</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="requirement_name">Nombre del Requisito *</Label>
                    <Input
                      id="requirement_name"
                      value={formData.requirement_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, requirement_name: e.target.value }))}
                      placeholder="Ej: Documento de Identidad"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Observaciones</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Detalles o instrucciones adicionales"
                      rows={3}
                    />
                  </div>

                  {/* Requisitos comunes para selección rápida */}
                  <div>
                    <Label>Requisitos Comunes (clic para agregar rápido)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {defaultRequirements.map((req) => (
                        <Badge
                          key={req}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => setFormData(prev => ({ ...prev, requirement_name: req }))}
                        >
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAdding(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={addRequirement.isPending}>
                      {addRequirement.isPending ? 'Agregando...' : 'Agregar Requisito'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de requisitos */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">Cargando requisitos...</div>
            ) : requirements && requirements.length > 0 ? (
              requirements.map((requirement) => (
                <Card key={requirement.id} className={requirement.is_completed ? 'bg-green-50 border-green-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={requirement.is_completed}
                        onCheckedChange={(checked) => 
                          toggleRequirement.mutate({ 
                            requirementId: requirement.id, 
                            isCompleted: checked as boolean 
                          })
                        }
                        disabled={toggleRequirement.isPending}
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${requirement.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                            {requirement.requirement_name}
                          </h3>
                          <div className="flex items-center gap-2">
                            {requirement.is_completed ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completado
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                          </div>
                        </div>

                        {requirement.notes && (
                          <p className="text-sm text-muted-foreground">
                            {requirement.notes}
                          </p>
                        )}

                        {requirement.is_completed && requirement.completed_at && (
                          <div className="text-xs text-muted-foreground">
                            Completado el {new Date(requirement.completed_at).toLocaleString()}
                            {requirement.profiles && (
                              <span> por {requirement.profiles.first_name} {requirement.profiles.last_name}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay requisitos registrados
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
