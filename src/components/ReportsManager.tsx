import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, Calendar as CalendarIcon, FileText, 
  BarChart3, PieChart, TrendingUp, Filter,
  Clock, Mail, RefreshCw
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportConfig {
  id?: string;
  name: string;
  description: string;
  type: 'sales' | 'clients' | 'performance' | 'financial';
  format: 'pdf' | 'excel' | 'csv';
  schedule?: 'daily' | 'weekly' | 'monthly' | null;
  filters: {
    dateFrom?: Date;
    dateTo?: Date;
    companies?: string[];
    plans?: string[];
    status?: string[];
    salespeople?: string[];
  };
  fields: string[];
  isActive: boolean;
  created_at?: string;
}

const predefinedReports: Omit<ReportConfig, 'id' | 'created_at'>[] = [
  {
    name: 'Reporte de Ventas Mensual',
    description: 'Resumen completo de ventas del mes actual',
    type: 'sales',
    format: 'pdf',
    schedule: 'monthly',
    filters: {
      dateFrom: startOfMonth(new Date()),
      dateTo: endOfMonth(new Date())
    },
    fields: ['client_name', 'plan_name', 'total_amount', 'status', 'created_at', 'salesperson'],
    isActive: true
  },
  {
    name: 'Análisis de Performance Semanal',
    description: 'Métricas de rendimiento por vendedor',
    type: 'performance',
    format: 'excel',
    schedule: 'weekly',
    filters: {},
    fields: ['salesperson', 'total_sales', 'conversion_rate', 'total_revenue'],
    isActive: true
  },
  {
    name: 'Estado de Clientes',
    description: 'Lista completa de clientes y su información',
    type: 'clients',
    format: 'csv',
    schedule: null,
    filters: {},
    fields: ['first_name', 'last_name', 'email', 'phone', 'created_at', 'total_purchases'],
    isActive: true
  },
  {
    name: 'Reporte Financiero Trimestral',
    description: 'Análisis financiero detallado de los últimos 3 meses',
    type: 'financial',
    format: 'pdf',
    schedule: null,
    filters: {
      dateFrom: subMonths(new Date(), 3),
      dateTo: new Date()
    },
    fields: ['total_revenue', 'avg_ticket', 'monthly_growth', 'top_plans', 'revenue_by_company'],
    isActive: true
  }
];

const useReportsData = () => {
  return useQuery({
    queryKey: ['reports-manager'],
    queryFn: async () => {
      // Obtener empresas para filtros
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .eq('active', true);

      // Obtener planes para filtros
      const { data: plans } = await supabase
        .from('plans')
        .select('id, name')
        .eq('active', true);

      // Obtener vendedores para filtros
      const { data: salespeople } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'vendedor')
        .eq('active', true);

      return {
        companies: companies || [],
        plans: plans || [],
        salespeople: salespeople || []
      };
    }
  });
};

const ReportsManager = () => {
  const [activeTab, setActiveTab] = useState('predefined');
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [customReport, setCustomReport] = useState<ReportConfig>({
    name: '',
    description: '',
    type: 'sales',
    format: 'pdf',
    schedule: null,
    filters: {},
    fields: [],
    isActive: true
  });

  const { data: reportsData, isLoading } = useReportsData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateReportMutation = useMutation({
    mutationFn: async (config: ReportConfig) => {
      // Simular generación de reporte
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportData = await generateReportData(config);
      downloadReport(reportData, config);
      
      return reportData;
    },
    onSuccess: (data, config) => {
      toast({
        title: "Reporte generado",
        description: `El reporte "${config.name}" se ha generado correctamente.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar el reporte. Inténtelo nuevamente.",
        variant: "destructive",
      });
    }
  });

  const generateReportData = async (config: ReportConfig) => {
    let query = supabase.from('sales').select(`
      *,
      clients(first_name, last_name, email, phone),
      plans(name, price),
      companies(name),
      salesperson:salesperson_id(first_name, last_name)
    `);

    // Aplicar filtros
    if (config.filters.dateFrom) {
      query = query.gte('created_at', config.filters.dateFrom.toISOString());
    }
    if (config.filters.dateTo) {
      query = query.lte('created_at', config.filters.dateTo.toISOString());
    }
    if (config.filters.status?.length) {
      query = query.in('status', config.filters.status as any);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  };

  const downloadReport = (data: any[], config: ReportConfig) => {
    let content = '';
    let mimeType = '';
    let extension = '';

    switch (config.format) {
      case 'csv':
        content = generateCSV(data, config.fields);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'excel':
        // Para simplicidad, generamos CSV que se puede abrir en Excel
        content = generateCSV(data, config.fields);
        mimeType = 'application/vnd.ms-excel';
        extension = 'csv';
        break;
      case 'pdf':
        // Para PDF, generaríamos HTML que se puede convertir
        content = generateHTML(data, config);
        mimeType = 'text/html';
        extension = 'html';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateCSV = (data: any[], fields: string[]) => {
    const headers = fields.join(',');
    const rows = data.map(row => {
      return fields.map(field => {
        let value = '';
        switch (field) {
          case 'client_name':
            value = `${row.clients?.first_name || ''} ${row.clients?.last_name || ''}`.trim();
            break;
          case 'plan_name':
            value = row.plans?.name || '';
            break;
          case 'company_name':
            value = row.companies?.name || '';
            break;
          case 'salesperson':
            value = `${row.salesperson?.first_name || ''} ${row.salesperson?.last_name || ''}`.trim();
            break;
          default:
            value = row[field] || '';
        }
        return `"${value}"`;
      }).join(',');
    });
    
    return [headers, ...rows].join('\n');
  };

  const generateHTML = (data: any[], config: ReportConfig) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${config.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>${config.name}</h1>
          <p>${config.description}</p>
          <div class="summary">
            <h3>Resumen</h3>
            <p>Total de registros: ${data.length}</p>
            <p>Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          <table>
            <thead>
              <tr>
                ${config.fields.map(field => `<th>${field}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${config.fields.map(field => {
                    let value = '';
                    switch (field) {
                      case 'client_name':
                        value = `${row.clients?.first_name || ''} ${row.clients?.last_name || ''}`.trim();
                        break;
                      case 'plan_name':
                        value = row.plans?.name || '';
                        break;
                      case 'company_name':
                        value = row.companies?.name || '';
                        break;
                      case 'salesperson':
                        value = `${row.salesperson?.first_name || ''} ${row.salesperson?.last_name || ''}`.trim();
                        break;
                      default:
                        value = row[field] || '';
                    }
                    return `<td>${value}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Gestión de Reportes</h2>
            <p className="text-muted-foreground">Genere y programe reportes personalizados</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Reportes</h2>
          <p className="text-muted-foreground">Genere y programe reportes personalizados</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="predefined">Reportes Predefinidos</TabsTrigger>
          <TabsTrigger value="custom">Crear Personalizado</TabsTrigger>
          <TabsTrigger value="scheduled">Programados</TabsTrigger>
        </TabsList>

        <TabsContent value="predefined" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {predefinedReports.map((report, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                    <Badge variant={report.isActive ? 'default' : 'secondary'}>
                      {report.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Formato: {report.format.toUpperCase()}
                    </div>
                    {report.schedule && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Programado: {report.schedule}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      {report.fields.length} campos incluidos
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      onClick={() => generateReportMutation.mutate(report)}
                      disabled={generateReportMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {generateReportMutation.isPending ? 'Generando...' : 'Generar'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                    >
                      Configurar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crear Reporte Personalizado</CardTitle>
              <CardDescription>
                Configure un reporte específico según sus necesidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Información básica */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reportName">Nombre del Reporte</Label>
                  <Input
                    id="reportName"
                    value={customReport.name}
                    onChange={(e) => setCustomReport({...customReport, name: e.target.value})}
                    placeholder="Ej: Reporte de Ventas Q1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportType">Tipo de Reporte</Label>
                  <Select 
                    value={customReport.type} 
                    onValueChange={(value: any) => setCustomReport({...customReport, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Ventas</SelectItem>
                      <SelectItem value="clients">Clientes</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="financial">Financiero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportDescription">Descripción</Label>
                <Input
                  id="reportDescription"
                  value={customReport.description}
                  onChange={(e) => setCustomReport({...customReport, description: e.target.value})}
                  placeholder="Descripción del reporte..."
                />
              </div>

              {/* Formato y programación */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Formato de Salida</Label>
                  <Select 
                    value={customReport.format} 
                    onValueChange={(value: any) => setCustomReport({...customReport, format: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Programación (Opcional)</Label>
                  <Select 
                    value={customReport.schedule || 'none'} 
                    onValueChange={(value) => setCustomReport({...customReport, schedule: value === 'none' ? null : value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin programar</SelectItem>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filtros de fecha */}
              <div className="space-y-2">
                <Label>Rango de Fechas</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {customReport.filters.dateFrom ? 
                          format(customReport.filters.dateFrom, 'dd/MM/yyyy', { locale: es }) : 
                          'Fecha desde'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customReport.filters.dateFrom}
                        onSelect={(date) => setCustomReport({
                          ...customReport, 
                          filters: {...customReport.filters, dateFrom: date}
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {customReport.filters.dateTo ? 
                          format(customReport.filters.dateTo, 'dd/MM/yyyy', { locale: es }) : 
                          'Fecha hasta'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customReport.filters.dateTo}
                        onSelect={(date) => setCustomReport({
                          ...customReport, 
                          filters: {...customReport.filters, dateTo: date}
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Campos a incluir */}
              <div className="space-y-2">
                <Label>Campos a Incluir</Label>
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    { id: 'client_name', label: 'Nombre del Cliente' },
                    { id: 'plan_name', label: 'Plan' },
                    { id: 'total_amount', label: 'Monto Total' },
                    { id: 'status', label: 'Estado' },
                    { id: 'created_at', label: 'Fecha de Creación' },
                    { id: 'salesperson', label: 'Vendedor' },
                    { id: 'company_name', label: 'Empresa' },
                    { id: 'notes', label: 'Notas' },
                  ].map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={customReport.fields.includes(field.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCustomReport({
                              ...customReport,
                              fields: [...customReport.fields, field.id]
                            });
                          } else {
                            setCustomReport({
                              ...customReport,
                              fields: customReport.fields.filter(f => f !== field.id)
                            });
                          }
                        }}
                      />
                      <label htmlFor={field.id} className="text-sm">
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => generateReportMutation.mutate(customReport)}
                  disabled={!customReport.name || !customReport.fields.length || generateReportMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generateReportMutation.isPending ? 'Generando...' : 'Generar Reporte'}
                </Button>
                <Button variant="outline">
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reportes Programados</CardTitle>
              <CardDescription>
                Gestione los reportes que se generan automáticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predefinedReports.filter(r => r.schedule).map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{report.name}</h4>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {report.schedule}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {report.format.toUpperCase()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Envío automático
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.isActive ? 'default' : 'secondary'}>
                        {report.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsManager;