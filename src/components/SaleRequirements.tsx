
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Plus, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  const [requirementText, setRequirementText] = useState('');

  const queryClient = useQueryClient();

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['sale-requirements', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_requirements')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open && !!saleId,
  });

  const addRequirement = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase
        .from('sale_requirements')
        .insert({
          sale_id: saleId,
          requirement_text: text,
          is_completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-requirements', saleId] });
      toast.success('Requisito agregado correctamente');
      setRequirementText('');
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

      const updateData: Record<string, any> = {
        is_completed: isCompleted,
      };

      if (isCompleted && user) {
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
    if (!requirementText.trim()) {
      toast.error('El texto del requisito es obligatorio');
      return;
    }
    addRequirement.mutate(requirementText);
  };

  const getCompletionPercentage = () => {
    if (!requirements || requirements.length === 0) return 0;
    const completed = requirements.filter(r => r.is_completed).length;
    return Math.round((completed / requirements.length) * 100);
  };

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
          {requirements.length > 0 && (
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
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Controla el cumplimiento de requisitos para esta venta
            </p>
            <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agregar Requisito
            </Button>
          </div>

          {isAdding && (
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="requirement_text">Descripción del Requisito *</Label>
                    <Input
                      id="requirement_text"
                      value={requirementText}
                      onChange={(e) => setRequirementText(e.target.value)}
                      placeholder="Ej: Documento de Identidad"
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={addRequirement.isPending}>
                      {addRequirement.isPending ? 'Agregando...' : 'Agregar'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">Cargando requisitos...</div>
            ) : requirements.length > 0 ? (
              requirements.map((requirement) => (
                <Card key={requirement.id} className={requirement.is_completed ? 'bg-green-50 border-green-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={requirement.is_completed || false}
                        onCheckedChange={(checked) => 
                          toggleRequirement.mutate({ 
                            requirementId: requirement.id, 
                            isCompleted: checked as boolean 
                          })
                        }
                        disabled={toggleRequirement.isPending}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${requirement.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                            {requirement.requirement_text}
                          </h3>
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
