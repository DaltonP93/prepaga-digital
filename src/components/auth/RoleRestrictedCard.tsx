
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface RoleRestrictedCardProps {
  userRole?: string;
  requiredRoles: string[];
}

export const RoleRestrictedCard = ({ userRole, requiredRoles }: RoleRestrictedCardProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-warning" />
          </div>
          <CardTitle>Acceso Restringido</CardTitle>
          <CardDescription>
            Tu rol actual ({userRole}) no tiene permisos para acceder a esta sección.
            Roles requeridos: {requiredRoles.join(', ')}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.history.back()} className="w-full">
            Volver
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
