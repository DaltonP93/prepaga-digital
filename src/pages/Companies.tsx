
import { useState } from 'react';
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, Users, FileText, Palette } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCompanies } from "@/hooks/useCompanies";
import { CompanyForm } from "@/components/CompanyForm";
import { CompanyActions } from "@/components/CompanyActions";
import { CompanyBrandingForm } from "@/components/CompanyBrandingForm";
import { useRolePermissions } from "@/hooks/useRolePermissions";

const Companies = () => {
  const { isSuperAdmin, isAdmin } = useRolePermissions();
  const { data: companies, isLoading } = useCompanies();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBrandingForm, setShowBrandingForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const canCreateCompany = isSuperAdmin;
  const canManageBranding = isSuperAdmin || isAdmin;
  
  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Layout title="Gestión de Empresas" description="Administrar empresas del sistema de seguros médicos">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Gestión de Empresas" 
      description="Administrar empresas del sistema de seguros médicos"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar empresas..." 
                className="pl-8 w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex space-x-2">
            {canManageBranding && (
              <Button 
                variant="outline" 
                onClick={() => setShowBrandingForm(true)}
              >
                <Palette className="mr-2 h-4 w-4" />
                Personalizar Marca
              </Button>
            )}
            {canCreateCompany && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Empresa
              </Button>
            )}
          </div>
        </div>

        {/* Branding Form */}
        {showBrandingForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Personalización de Marca</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowBrandingForm(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="p-6">
                <CompanyBrandingForm />
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Empresas registradas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas Activas</CardTitle>
              <Building2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companies?.filter(c => c.is_active).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Activas del total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Promedio por empresa</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Planes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Promedio por empresa</p>
            </CardContent>
          </Card>
        </div>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Empresas</CardTitle>
            <CardDescription>Gestiona todas las empresas registradas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="w-[70px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{company.address || '-'}</TableCell>
                    <TableCell>{company.phone || '-'}</TableCell>
                    <TableCell>{company.email || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={company.is_active ? "default" : "secondary"}
                        className={company.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {company.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(company.created_at || '').toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <CompanyActions company={company} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredCompanies.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No se encontraron empresas que coincidan con la búsqueda' : 'No hay empresas registradas'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <CompanyForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
        />
      </div>
    </Layout>
  );
};

export default Companies;
