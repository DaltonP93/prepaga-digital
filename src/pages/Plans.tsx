
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlanForm } from '@/components/PlanForm';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';
import { useRolePermissions } from '@/hooks/useRolePermissions';

const Plans = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const { formatCurrency } = useCurrencySettings();
  const { can } = useRolePermissions();
  const queryClient = useQueryClient();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching plans:', error);
        throw error;
      }
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan eliminado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar el plan: ' + error.message);
    }
  });

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDelete = async (planId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este plan?')) {
      deleteMutation.mutate(planId);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const canCreatePlan = can('plans', 'create');
  const canEditPlan = can('plans', 'update');
  const canDeletePlan = can('plans', 'delete');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Planes</h1>
          <p className="text-muted-foreground">
            Gestión de planes de seguro
          </p>
        </div>
        {canCreatePlan && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Plan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans?.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                {(canEditPlan || canDeletePlan) && (
                  <div className="flex gap-1">
                    {canEditPlan && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeletePlan && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {formatCurrency(plan.price)}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>

                {plan.coverage_details && typeof plan.coverage_details === 'object' && (
                  <div>
                    <h4 className="font-medium mb-2">Detalles de Cobertura:</h4>
                    <p className="text-sm text-muted-foreground">
                      {JSON.stringify(plan.coverage_details)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <PlanForm
          open={showForm}
          onOpenChange={handleCloseForm}
          plan={editingPlan}
        />
      )}
    </div>
  );
};

export default Plans;
