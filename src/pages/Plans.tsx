
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PlanForm } from "@/components/PlanForm";
import { usePlans, useDeletePlan } from "@/hooks/usePlans";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { Database } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Plan = Database['public']['Tables']['plans']['Row'];

const Plans = () => {
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const { data: plans = [], isLoading } = usePlans();
  const { formatCurrency } = useCurrencySettings();
  const deletePlan = useDeletePlan();

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setShowPlanForm(true);
  };

  const handleDeletePlan = async (planId: string) => {
    await deletePlan.mutateAsync(planId);
  };

  const handleCloseForm = () => {
    setShowPlanForm(false);
    setEditingPlan(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Planes de Seguro</h2>
          <p className="text-muted-foreground">
            Gestiona los planes de seguros médicos disponibles
          </p>
        </div>
        <Button onClick={() => setShowPlanForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Plan
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="text-2xl font-bold text-primary mt-2">
                    {formatCurrency(plan.price)}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Badge variant={plan.active ? 'default' : 'secondary'}>
                    {plan.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plan.description && (
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                )}
                
                {plan.coverage_details && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Coberturas:</h4>
                    <p className="text-xs text-muted-foreground">
                      {plan.coverage_details.substring(0, 100)}
                      {plan.coverage_details.length > 100 && "..."}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    {plan.companies?.name || 'Sin empresa'}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPlan(plan)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar plan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el plan "{plan.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePlan(plan.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No hay planes registrados</p>
            <Button className="mt-4" onClick={() => setShowPlanForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer plan
            </Button>
          </CardContent>
        </Card>
      )}

      <PlanForm
        open={showPlanForm}
        onOpenChange={handleCloseForm}
        plan={editingPlan}
      />
    </div>
  );
};

export default Plans;
