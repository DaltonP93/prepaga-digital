import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ExportData {
  data: any[];
  filename: string;
  type: 'csv' | 'excel' | 'pdf' | 'json';
  headers?: string[];
  title?: string;
  description?: string;
}

export const useExport = () => {
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async ({ data, filename, type, headers, title, description }: ExportData) => {
      let content = '';
      let mimeType = '';
      let extension = type;

      switch (type) {
        case 'csv':
          content = generateCSV(data, headers);
          mimeType = 'text/csv;charset=utf-8';
          break;
        case 'excel':
          content = generateCSV(data, headers); // Para simplicidad, usamos CSV que Excel puede abrir
          mimeType = 'application/vnd.ms-excel';
          extension = 'csv';
          break;
        case 'json':
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          break;
        case 'pdf':
          content = generateHTML(data, { title, description, headers });
          mimeType = 'text/html';
          extension = 'html';
          break;
        default:
          throw new Error('Tipo de exportación no soportado');
      }

      // Crear y descargar archivo
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, filename: link.download };
    },
    onSuccess: (result) => {
      toast({
        title: "Exportación exitosa",
        description: `Archivo ${result.filename} descargado correctamente.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en exportación",
        description: error.message || "No se pudo exportar los datos.",
        variant: "destructive",
      });
    }
  });

  return {
    exportData: exportMutation.mutate,
    isExporting: exportMutation.isPending,
    error: exportMutation.error
  };
};

// Función para generar CSV
const generateCSV = (data: any[], headers?: string[]): string => {
  if (!data.length) return '';

  // Si no se proporcionan headers, usar las claves del primer objeto
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Generar fila de encabezados
  const headerRow = csvHeaders.map(header => `"${header}"`).join(',');
  
  // Generar filas de datos
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      let value = '';
      
      // Manejar valores anidados
      const keys = header.split('.');
      let currentValue = row;
      for (const key of keys) {
        currentValue = currentValue?.[key];
      }
      
      value = currentValue?.toString() || '';
      
      // Escapar comillas dobles
      value = value.replace(/"/g, '""');
      
      return `"${value}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

// Función para generar HTML (para PDF)
const generateHTML = (
  data: any[], 
  options: { title?: string; description?: string; headers?: string[] }
): string => {
  const { title = 'Reporte', description, headers } = options;
  
  if (!data.length) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            .no-data { text-align: center; color: #6b7280; font-style: italic; padding: 40px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${description ? `<p>${description}</p>` : ''}
          <div class="no-data">No hay datos para mostrar</div>
        </body>
      </html>
    `;
  }

  const tableHeaders = headers || Object.keys(data[0]);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            color: #333; 
            line-height: 1.6;
          }
          h1 { 
            color: #2563eb; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 10px; 
            margin-bottom: 20px;
          }
          .meta { 
            background-color: #f8fafc; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-size: 14px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th { 
            background-color: #3b82f6; 
            color: white; 
            padding: 12px 8px; 
            text-align: left; 
            font-weight: 600;
          }
          td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #e5e7eb; 
          }
          tr:nth-child(even) { 
            background-color: #f8fafc; 
          }
          tr:hover { 
            background-color: #e0f2fe; 
          }
          .summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 20px 0;
            padding: 15px;
            background-color: #ecfdf5;
            border-radius: 8px;
            border-left: 4px solid #10b981;
          }
          @media print {
            body { margin: 20px; }
            .summary { break-inside: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; break-after: auto; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${description ? `<p style="color: #6b7280; font-size: 16px;">${description}</p>` : ''}
        
        <div class="meta">
          <div><strong>Total de registros:</strong> ${data.length}</div>
          <div><strong>Fecha de generación:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
        </div>

        <div class="summary">
          <span><strong>Resumen:</strong> ${data.length} elementos exportados</span>
          <span style="color: #10b981; font-weight: 600;">✓ Exportación completa</span>
        </div>
        
        <table>
          <thead>
            <tr>
              ${tableHeaders.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${tableHeaders.map(header => {
                  // Manejar valores anidados
                  const keys = header.split('.');
                  let value = row;
                  for (const key of keys) {
                    value = value?.[key];
                  }
                  
                  // Formatear valores especiales
                  if (value instanceof Date) {
                    value = format(new Date(value), 'dd/MM/yyyy');
                  } else if (typeof value === 'number' && header.includes('amount')) {
                    value = `$${value.toLocaleString('es-PY')}`;
                  } else if (typeof value === 'boolean') {
                    value = value ? 'Sí' : 'No';
                  }
                  
                  return `<td>${value || '-'}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
          Reporte generado automáticamente - ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
        </div>
      </body>
    </html>
  `;
};