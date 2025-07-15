
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTestData } from '@/hooks/useTestData';
import { Database, Loader2 } from 'lucide-react';

export const TestDataManager = () => {
  const { createTestData, isCreating } = useTestData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5" />
          Datos de Prueba
        </CardTitle>
        <CardDescription>
          Crea datos de ejemplo para probar todas las funcionalidades del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Los datos de prueba incluyen:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>3 clientes de ejemplo</li>
              <li>3 planes de servicios</li>
              <li>1 template de contrato</li>
              <li>2 ventas en diferentes estados</li>
              <li>Documentos asociados</li>
            </ul>
          </div>
          
          <Button
            onClick={createTestData}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando datos...
              </>
            ) : (
              'Crear Datos de Prueba'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
