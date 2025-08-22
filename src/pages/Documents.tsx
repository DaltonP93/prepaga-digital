
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocuments } from "@/hooks/useDocuments";
import { SearchAndFilters, FilterOptions } from "@/components/SearchAndFilters";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DocuSealForm } from "@/components/DocuSealForm";
import { Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentForm } from "@/components/DocumentForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Documents: React.FC = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    status: "",
    dateFrom: undefined,
    dateTo: undefined,
    company: "",
    plan: "",
  });
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState("documents");

  const { documents, isLoading, createDocument, updateDocument, deleteDocument } = useDocuments();

  const handleCreateDocument = () => {
    setShowCreateForm(true);
    setSelectedDocument(null);
  };

  const handleDocumentCreated = (document: any) => {
    toast({
      title: "Documento creado",
      description: "El documento se ha creado exitosamente.",
    });
    setShowCreateForm(false);
  };

  const handleDocumentUpdated = (document: any) => {
    toast({
      title: "Documento actualizado",
      description: "El documento se ha actualizado exitosamente.",
    });
  };

  const handleDocumentDeleted = () => {
    toast({
      title: "Documento eliminado",
      description: "El documento se ha eliminado exitosamente.",
    });
    setSelectedDocument(null);
  };

  const handleDocuSealCompleted = (data: any) => {
    toast({
      title: "Documento completado",
      description: "El documento de DocuSeal ha sido completado exitosamente.",
    });
    console.log("DocuSeal completion data:", data);
  };

  const filteredDocuments = documents?.filter((doc: any) => {
    const matchesSearch = !filters.search || 
      doc.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      doc.content?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus = !filters.status || doc.status === filters.status;
    const matchesType = !filters.company || doc.document_type === filters.company;

    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">
            Gestiona y organiza todos tus documentos
          </p>
        </div>
        <Button onClick={handleCreateDocument} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Documento
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos Internos
          </TabsTrigger>
          <TabsTrigger value="docuseal" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            DocuSeal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          {/* Search and Filters */}
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            statusOptions={[
              { value: "draft", label: "Borrador" },
              { value: "published", label: "Publicado" },
              { value: "archived", label: "Archivado" },
            ]}
            companyOptions={[
              { value: "contract", label: "Contrato" },
              { value: "policy", label: "Póliza" },
              { value: "report", label: "Reporte" },
            ]}
            planOptions={[]}
            showExport={true}
            onExport={() => {
              toast({
                title: "Exportando",
                description: "Preparando la exportación de documentos...",
              });
            }}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Documentos ({filteredDocuments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredDocuments.length > 0 ? (
                  <div className="space-y-4">
                    {filteredDocuments.map((doc: any) => (
                      <div
                        key={doc.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedDocument?.id === doc.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowCreateForm(false);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{doc.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {doc.document_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('¿Está seguro de que desea eliminar este documento?')) {
                                deleteDocument(doc.id);
                              }
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No hay documentos disponibles
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Document Preview/Create Form */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {showCreateForm
                    ? "Crear Nuevo Documento"
                    : selectedDocument
                    ? "Vista Previa del Documento"
                    : "Selecciona un documento"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showCreateForm ? (
                  <DocumentForm
                    onSubmit={(documentData) => {
                      createDocument(documentData);
                      handleDocumentCreated(documentData);
                    }}
                    onCancel={() => setShowCreateForm(false)}
                  />
                ) : selectedDocument ? (
                  <DocumentPreview
                    content={selectedDocument.content || ""}
                    dynamicFields={selectedDocument.dynamic_fields || []}
                    templateType={selectedDocument.document_type || "document"}
                    templateName={selectedDocument.name || "documento"}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Selecciona un documento de la lista para ver la vista previa</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documents?.length || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Borradores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {documents?.filter((doc: any) => doc.status === "draft").length || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Publicados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {documents?.filter((doc: any) => doc.status === "published").length || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Archivados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {documents?.filter((doc: any) => doc.status === "archived").length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="docuseal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>DocuSeal - Firma Digital</CardTitle>
              <p className="text-muted-foreground">
                Utiliza DocuSeal para firmar documentos digitalmente
              </p>
            </CardHeader>
            <CardContent>
              <DocuSealForm
                src="https://docuseal.com/d/LEVGR9rhZYf86M"
                email="dalton.perez+test@saa.com.py"
                onCompleted={handleDocuSealCompleted}
                className="w-full"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Documents;
