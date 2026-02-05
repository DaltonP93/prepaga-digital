import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Package, FileText, Plus, Trash2, GripVertical, FileSignature } from 'lucide-react';

interface DocumentPackageSelectorProps {
  saleId: string;
  onPackageCreated?: (packageId: string) => void;
}

export const DocumentPackageSelector: React.FC<DocumentPackageSelectorProps> = ({
  saleId,
  onPackageCreated,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [packageName, setPackageName] = useState('');
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch document types
  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing packages for this sale
  const { data: existingPackages = [], isLoading } = useQuery({
    queryKey: ['document-packages', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_packages')
        .select(`
          *,
          document_package_items (
            *,
            documents (*)
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });

  // Fetch available documents for the sale
  const { data: saleDocuments = [] } = useQuery({
    queryKey: ['sale-documents', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });

  // Create document package
  const createPackage = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create package
      const { data: packageData, error: packageError } = await supabase
        .from('document_packages')
        .insert({
          sale_id: saleId,
          name: packageName || `Paquete ${new Date().toLocaleDateString()}`,
          package_type: 'firma_cliente',
          created_by: user?.id,
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // Add selected documents to package
      if (selectedDocTypes.length > 0) {
        const itemsToInsert = selectedDocTypes.map((docId, index) => ({
          package_id: packageData.id,
          document_id: docId,
          sort_order: index,
          is_required: true,
        }));

        const { error: itemsError } = await supabase
          .from('document_package_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return packageData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-packages', saleId] });
      setPackageName('');
      setSelectedDocTypes([]);
      setIsCreating(false);
      toast({
        title: 'Paquete creado',
        description: 'El paquete de documentos ha sido creado exitosamente.',
      });
      onPackageCreated?.(data.id);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el paquete.',
        variant: 'destructive',
      });
    },
  });

  // Delete package
  const deletePackage = useMutation({
    mutationFn: async (packageId: string) => {
      // Delete items first
      await supabase
        .from('document_package_items')
        .delete()
        .eq('package_id', packageId);

      // Then delete package
      const { error } = await supabase
        .from('document_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-packages', saleId] });
      toast({
        title: 'Paquete eliminado',
        description: 'El paquete ha sido eliminado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el paquete.',
        variant: 'destructive',
      });
    },
  });

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocTypes(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const getPackageStatusBadge = (items: any[]) => {
    const totalDocs = items.length;
    const signedDocs = items.filter(item => item.documents?.status === 'firmado').length;

    if (signedDocs === 0) {
      return <Badge variant="outline" className="text-yellow-600">Pendiente</Badge>;
    }
    if (signedDocs === totalDocs) {
      return <Badge className="bg-green-600">Completo</Badge>;
    }
    return <Badge variant="outline" className="text-blue-600">{signedDocs}/{totalDocs} firmados</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Paquetes de Documentos
        </CardTitle>
        <CardDescription>
          Agrupa documentos para enviar en conjunto para firma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Package */}
        {!isCreating ? (
          <Button
            variant="outline"
            onClick={() => setIsCreating(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Nuevo Paquete
          </Button>
        ) : (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
            <div>
              <Label htmlFor="packageName">Nombre del Paquete</Label>
              <Input
                id="packageName"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="Ej: Documentos de Firma - Cliente"
              />
            </div>

            {saleDocuments.length > 0 && (
              <div className="space-y-2">
                <Label>Seleccionar Documentos</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded bg-background">
                  {saleDocuments.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-muted"
                    >
                      <Checkbox
                        id={doc.id}
                        checked={selectedDocTypes.includes(doc.id)}
                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                      />
                      <label
                        htmlFor={doc.id}
                        className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{doc.name}</span>
                        {doc.requires_signature && (
                          <FileSignature className="h-3 w-3 text-primary" />
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setPackageName('');
                  setSelectedDocTypes([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createPackage.mutate()}
                disabled={createPackage.isPending}
              >
                Crear Paquete
              </Button>
            </div>
          </div>
        )}

        {/* Existing Packages */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Cargando paquetes...
          </p>
        ) : existingPackages.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Paquetes Existentes
            </h4>
            {existingPackages.map((pkg: any) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pkg.name}</span>
                      {getPackageStatusBadge(pkg.document_package_items || [])}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pkg.document_package_items?.length || 0} documento(s)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Creado: {new Date(pkg.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('¿Eliminar este paquete?')) {
                      deletePackage.mutate(pkg.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay paquetes de documentos creados
          </p>
        )}
      </CardContent>
    </Card>
  );
};
