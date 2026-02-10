
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, GitBranch } from "lucide-react";
import { CompanyForm } from "@/components/CompanyForm";
import { WorkflowConfigDialog } from "@/components/workflow/WorkflowConfigDialog";
import { useDeleteCompany } from "@/hooks/useCompanies";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database } from "@/integrations/supabase/types";

type Company = Database['public']['Tables']['companies']['Row'];

interface CompanyActionsProps {
  company: Company;
}

export function CompanyActions({ company }: CompanyActionsProps) {
  const { profile } = useSimpleAuthContext();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showWorkflowConfig, setShowWorkflowConfig] = useState(false);
  const deleteCompany = useDeleteCompany();
  const canConfigureWorkflow = ['admin', 'super_admin'].includes(profile?.role || '');

  const handleDelete = async () => {
    await deleteCompany.mutateAsync(company.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowEditForm(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          {canConfigureWorkflow && (
            <DropdownMenuItem onClick={() => setShowWorkflowConfig(true)}>
              <GitBranch className="mr-2 h-4 w-4" />
              Configurar Flujo
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Desactivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CompanyForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        company={company}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la empresa "{company.name}". Los usuarios asociados ya no podrán acceder a sus datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canConfigureWorkflow && (
        <WorkflowConfigDialog
          open={showWorkflowConfig}
          onOpenChange={setShowWorkflowConfig}
          company={company}
        />
      )}
    </>
  );
}
