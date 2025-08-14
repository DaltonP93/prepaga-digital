
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlanForm } from '@/components/PlanForm';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';

const Plans = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const { profile } = useSimpleAuthContext();
  const { data: currencySettings } = useCurrencySettings();
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
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

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  if (isLoading) {
    return (
      <Layout title="Planes" description="Gestión de planes de seguro">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Planes" description="Gestión de planes de seguro">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Planes Disponibles</h2>
            <p className="text-muted-foreground">
              Gestiona los planes de seguro disponibles
            </p>
          </div>
          {isAdmin && (
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
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {formatCurrency(plan.price, currencySettings)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      por {plan.billing_period === 'monthly' ? 'mes' : 'año'}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={plan.active ? 'default' : 'secondary'}>
                      {plan.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Badge variant="outline">
                      {plan.billing_period === 'monthly' ? 'Mensual' : 'Anual'}
                    </Badge>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Características:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {plan.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
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
    </Layout>
  );
};

export default Plans;
