import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { WorkflowConfigPanel } from "./WorkflowConfigPanel";
import type { Database } from "@/integrations/supabase/types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface WorkflowConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
}

export function WorkflowConfigDialog({ open, onOpenChange, company }: WorkflowConfigDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Flujo de Venta - {company.name}</SheetTitle>
          <SheetDescription>
            Configura las transiciones de estado, condiciones y permisos por rol para las ventas de esta empresa.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <WorkflowConfigPanel companyId={company.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
