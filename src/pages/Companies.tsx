
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Building2, Users, FileText, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const companies = [
  {
    id: 1,
    name: "MediCorp SA",
    address: "Av. Corrientes 1234, CABA",
    phone: "+54 11 4567-8901",
    users: 12,
    plans: 5,
    status: "active",
    created: "2024-01-15"
  },
  {
    id: 2,
    name: "Salud Plus",
    address: "Av. Santa Fe 5678, CABA",
    phone: "+54 11 2345-6789",
    users: 8,
    plans: 3,
    status: "active",
    created: "2024-02-20"
  },
  {
    id: 3,
    name: "VidaSana",
    address: "Av. Rivadavia 9012, CABA",
    phone: "+54 11 9876-5432",
    users: 15,
    plans: 7,
    status: "inactive",
    created: "2024-03-10"
  }
];

const Companies = () => {
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
              <Input placeholder="Buscar empresas..." className="pl-8 w-[300px]" />
            </div>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Empresa
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+2 este mes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas Activas</CardTitle>
              <Building2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">22</div>
              <p className="text-xs text-muted-foreground">91.7% del total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">Promedio 6.5 por empresa</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Planes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78</div>
              <p className="text-xs text-muted-foreground">Promedio 3.3 por empresa</p>
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
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Planes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="w-[70px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{company.address}</TableCell>
                    <TableCell>{company.phone}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{company.users}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{company.plans}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={company.status === "active" ? "default" : "secondary"}
                        className={company.status === "active" ? "bg-green-100 text-green-800" : ""}
                      >
                        {company.status === "active" ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(company.created).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Company Form */}
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Empresa</CardTitle>
            <CardDescription>Registra una nueva empresa en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nombre de la Empresa</Label>
                <Input id="company-name" placeholder="Ej: MediCorp SA" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Teléfono</Label>
                <Input id="company-phone" placeholder="+54 11 1234-5678" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Dirección</Label>
              <Input id="company-address" placeholder="Av. Corrientes 1234, CABA" />
            </div>
            <Button>Crear Empresa</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Companies;
