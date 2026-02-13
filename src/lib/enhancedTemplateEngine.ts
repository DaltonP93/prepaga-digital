// Enhanced Template Engine for dynamic document generation with beneficiaries support
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency as formatPygCurrency } from '@/lib/utils';

export interface BeneficiaryContext {
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  dni: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  edad: number;
  parentesco: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  genero: string;
  estadoCivil: string;
  ocupacion: string;
  tienePreexistencias: boolean;
  detallePreexistencias: string;
  monto: number;
  montoFormateado: string;
  requiereFirma: boolean;
  estadoFirma: string;
}

export interface EnhancedTemplateContext {
  cliente: {
    nombre: string;
    apellido: string;
    nombreCompleto: string;
    email: string;
    telefono: string;
    dni: string;
    direccion: string;
    ciudad: string;
    provincia: string;
    codigoPostal: string;
    fechaNacimiento: string;
    edad: number;
  };
  plan: {
    nombre: string;
    precio: number;
    precioFormateado: string;
    descripcion: string;
    cobertura: string;
  };
  empresa: {
    nombre: string;
    email: string;
    telefono: string;
    direccion: string;
    logo: string;
    colorPrimario: string;
    colorSecundario: string;
  };
  venta: {
    id: string;
    fecha: string;
    fechaFormateada: string;
    total: number;
    totalFormateado: string;
    vendedor: string;
    vendedorEmail: string;
    notas: string;
    estado: string;
    numeroContrato: string;
    numeroSolicitud: string;
    cantidadAdherentes: number;
    fechaInicioContrato: string;
    fechaInicioContratoFormateada: string;
  };
  facturacion: {
    razonSocial: string;
    ruc: string;
    email: string;
    telefono: string;
  };
  firma: {
    enlace: string;
    token: string;
    fechaExpiracion: string;
    estado: string;
  };
  fecha: {
    actual: string;
    actualFormateada: string;
    horaActual: string;
    anio: string;
    mes: string;
    dia: string;
  };
  beneficiarios: BeneficiaryContext[];
  beneficiarioPrincipal: BeneficiaryContext | null;
  respuestas: Record<string, any>;
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Format currency with locale
 */
function formatCurrency(amount: number, currencySymbol = '$'): string {
  if (currencySymbol === '$') {
    return formatPygCurrency(amount);
  }

  const sanitizedAmount = amount.toLocaleString('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${currencySymbol} ${sanitizedAmount}`;
}

/**
 * Format date with Spanish locale
 */
function formatDate(date: string | Date | null, formatStr = 'dd/MM/yyyy'): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, formatStr, { locale: es });
  } catch {
    return '';
  }
}

/**
 * Create beneficiary context from database record
 */
function createBeneficiaryContext(beneficiary: any): BeneficiaryContext {
  return {
    nombre: beneficiary.first_name || '',
    apellido: beneficiary.last_name || '',
    nombreCompleto: `${beneficiary.first_name || ''} ${beneficiary.last_name || ''}`.trim(),
    dni: beneficiary.document_number || beneficiary.dni || '',
    email: beneficiary.email || '',
    telefono: beneficiary.phone || '',
    fechaNacimiento: formatDate(beneficiary.birth_date),
    edad: calculateAge(beneficiary.birth_date),
    parentesco: beneficiary.relationship || 'Titular',
    direccion: beneficiary.address || '',
    ciudad: beneficiary.city || '',
    provincia: beneficiary.province || '',
    codigoPostal: beneficiary.postal_code || '',
    genero: beneficiary.gender || '',
    estadoCivil: beneficiary.marital_status || '',
    ocupacion: beneficiary.occupation || '',
    tienePreexistencias: beneficiary.has_preexisting_conditions || false,
    detallePreexistencias: beneficiary.preexisting_conditions_detail || '',
    monto: beneficiary.amount || 0,
    montoFormateado: formatCurrency(beneficiary.amount || 0),
    requiereFirma: beneficiary.signature_required !== false,
    estadoFirma: 'pendiente', // Will be updated from signature_links
  };
}

/**
 * Create enhanced template context from sale data
 */
export function createEnhancedTemplateContext(
  client: any,
  plan: any,
  company: any,
  sale: any,
  beneficiaries: any[] = [],
  signatureLink?: any,
  responses?: Record<string, any>
): EnhancedTemplateContext {
  const now = new Date();
  
  // Create beneficiary contexts
  const beneficiaryContexts = beneficiaries.map(b => createBeneficiaryContext(b));
  const primaryBeneficiary = beneficiaryContexts.find(b => b.parentesco === 'Titular') || beneficiaryContexts[0] || null;

  return {
    cliente: {
      nombre: client?.first_name || '',
      apellido: client?.last_name || '',
      nombreCompleto: `${client?.first_name || ''} ${client?.last_name || ''}`.trim(),
      email: client?.email || '',
      telefono: client?.phone || '',
      dni: client?.dni || '',
      direccion: client?.address || '',
      ciudad: client?.city || '',
      provincia: client?.province || '',
      codigoPostal: client?.postal_code || '',
      fechaNacimiento: formatDate(client?.birth_date),
      edad: calculateAge(client?.birth_date),
    },
    plan: {
      nombre: plan?.name || '',
      precio: plan?.price || 0,
      precioFormateado: formatCurrency(plan?.price || 0),
      descripcion: plan?.description || '',
      cobertura: typeof plan?.coverage_details === 'object' 
        ? JSON.stringify(plan?.coverage_details) 
        : plan?.coverage_details || '',
    },
    empresa: {
      nombre: company?.name || '',
      email: company?.email || '',
      telefono: company?.phone || '',
      direccion: company?.address || '',
      logo: company?.logo_url || '',
      colorPrimario: company?.primary_color || '#3B82F6',
      colorSecundario: company?.secondary_color || '#1E40AF',
    },
    venta: {
      id: sale?.id || '',
      fecha: sale?.sale_date || formatDate(now, 'yyyy-MM-dd'),
      fechaFormateada: formatDate(sale?.sale_date || now, "d 'de' MMMM 'de' yyyy"),
      total: sale?.total_amount || 0,
      totalFormateado: formatCurrency(sale?.total_amount || 0),
      vendedor: sale?.salesperson ? `${sale.salesperson.first_name || ''} ${sale.salesperson.last_name || ''}`.trim() : '',
      vendedorEmail: sale?.salesperson?.email || '',
      notas: sale?.notes || '',
      estado: sale?.status || 'borrador',
      numeroContrato: sale?.contract_number || '',
      numeroSolicitud: sale?.request_number || '',
      cantidadAdherentes: sale?.adherents_count || beneficiaries.length,
      fechaInicioContrato: sale?.contract_start_date ? formatDate(sale.contract_start_date, 'dd/MM/yyyy') : '',
      fechaInicioContratoFormateada: sale?.contract_start_date ? formatDate(sale.contract_start_date, "d 'de' MMMM 'de' yyyy") : '',
    },
    facturacion: {
      razonSocial: sale?.billing_razon_social || '',
      ruc: sale?.billing_ruc || '',
      email: sale?.billing_email || '',
      telefono: sale?.billing_phone || '',
    },
    firma: {
      enlace: signatureLink ? `${window.location.origin}/firmar/${signatureLink.token}` : '',
      token: signatureLink?.token || '',
      fechaExpiracion: formatDate(signatureLink?.expires_at, "d 'de' MMMM 'de' yyyy"),
      estado: signatureLink?.status || 'pendiente',
    },
    fecha: {
      actual: formatDate(now, 'yyyy-MM-dd'),
      actualFormateada: formatDate(now, "d 'de' MMMM 'de' yyyy"),
      horaActual: formatDate(now, 'HH:mm'),
      anio: formatDate(now, 'yyyy'),
      mes: formatDate(now, 'MMMM'),
      dia: formatDate(now, 'd'),
    },
    beneficiarios: beneficiaryContexts,
    beneficiarioPrincipal: primaryBeneficiary,
    respuestas: responses || {},
  };
}

/**
 * Interpolate template with enhanced context
 */
export function interpolateEnhancedTemplate(template: string, context: EnhancedTemplateContext): string {
  let result = template;

  // Helper to replace nested variables
  const replaceNestedVariables = (obj: any, prefix: string) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const placeholder = `{{${prefix}.${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      
      if (value !== null && value !== undefined && typeof value !== 'object') {
        result = result.replace(regex, String(value));
      }
    });
  };

  // Replace main context variables
  replaceNestedVariables(context.cliente, 'cliente');
  replaceNestedVariables(context.plan, 'plan');
  replaceNestedVariables(context.empresa, 'empresa');
  replaceNestedVariables(context.venta, 'venta');
  replaceNestedVariables(context.facturacion, 'facturacion');
  replaceNestedVariables(context.firma, 'firma');
  replaceNestedVariables(context.fecha, 'fecha');
  
  // Replace primary beneficiary
  if (context.beneficiarioPrincipal) {
    replaceNestedVariables(context.beneficiarioPrincipal, 'beneficiarioPrincipal');
    replaceNestedVariables(context.beneficiarioPrincipal, 'titular');
  }

  // Legacy aliases for backward compatibility with existing templates
  const legacyAliases: Record<string, string> = {
    '{{titular_nombre}}': context.cliente.nombreCompleto,
    '{{titular_email}}': context.cliente.email,
    '{{titular_telefono}}': context.cliente.telefono,
    '{{titular_dni}}': context.cliente.dni,
    '{{titular_direccion}}': context.cliente.direccion,
    '{{monto_total}}': context.venta.totalFormateado,
    '{{razon_social}}': context.facturacion.razonSocial,
    '{{ruc}}': context.facturacion.ruc,
    '{{billing_email}}': context.facturacion.email,
    '{{billing_telefono}}': context.facturacion.telefono,
  };
  Object.entries(legacyAliases).forEach(([placeholder, value]) => {
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, String(value || ''));
  });

  // Replace responses
  if (context.respuestas) {
    Object.entries(context.respuestas).forEach(([key, value]) => {
      const placeholder = `{{respuestas.${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, String(value || ''));
    });
  }

  // Handle beneficiaries loop {{#beneficiarios}}...{{/beneficiarios}}
  const beneficiariesLoopRegex = /\{\{#beneficiarios\}\}([\s\S]*?)\{\{\/beneficiarios\}\}/gi;
  result = result.replace(beneficiariesLoopRegex, (_, content) => {
    return context.beneficiarios.map((beneficiary, index) => {
      let itemResult = content;
      // Replace beneficiary-specific placeholders
      Object.keys(beneficiary).forEach(key => {
        const value = (beneficiary as any)[key];
        const placeholder = `{{${key}}}`;
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (value !== null && value !== undefined && typeof value !== 'object') {
          itemResult = itemResult.replace(regex, String(value));
        }
      });
      // Replace index
      itemResult = itemResult.replace(/\{\{indice\}\}/gi, String(index + 1));
      return itemResult;
    }).join('');
  });

  // Clean up any remaining unmatched placeholders (optional - can remove or make configurable)
  // result = result.replace(/\{\{[^}]+\}\}/g, '');

  return result;
}

/**
 * Get all available template variables with descriptions
 */
export function getEnhancedTemplateVariables(): { category: string; variables: { key: string; description: string }[] }[] {
  return [
    {
      category: 'Cliente',
      variables: [
        { key: '{{cliente.nombre}}', description: 'Nombre del cliente' },
        { key: '{{cliente.apellido}}', description: 'Apellido del cliente' },
        { key: '{{cliente.nombreCompleto}}', description: 'Nombre completo del cliente' },
        { key: '{{cliente.email}}', description: 'Email del cliente' },
        { key: '{{cliente.telefono}}', description: 'Teléfono del cliente' },
        { key: '{{cliente.dni}}', description: 'DNI/Documento del cliente' },
        { key: '{{cliente.direccion}}', description: 'Dirección del cliente' },
        { key: '{{cliente.ciudad}}', description: 'Ciudad del cliente' },
        { key: '{{cliente.provincia}}', description: 'Provincia del cliente' },
        { key: '{{cliente.fechaNacimiento}}', description: 'Fecha de nacimiento' },
        { key: '{{cliente.edad}}', description: 'Edad del cliente' },
      ],
    },
    {
      category: 'Plan',
      variables: [
        { key: '{{plan.nombre}}', description: 'Nombre del plan' },
        { key: '{{plan.precio}}', description: 'Precio del plan (número)' },
        { key: '{{plan.precioFormateado}}', description: 'Precio del plan (formateado en Gs.)' },
        { key: '{{plan.descripcion}}', description: 'Descripción del plan' },
        { key: '{{plan.cobertura}}', description: 'Detalles de cobertura' },
      ],
    },
    {
      category: 'Empresa',
      variables: [
        { key: '{{empresa.nombre}}', description: 'Nombre de la empresa' },
        { key: '{{empresa.email}}', description: 'Email de la empresa' },
        { key: '{{empresa.telefono}}', description: 'Teléfono de la empresa' },
        { key: '{{empresa.direccion}}', description: 'Dirección de la empresa' },
      ],
    },
    {
      category: 'Venta',
      variables: [
        { key: '{{venta.fecha}}', description: 'Fecha de la venta' },
        { key: '{{venta.fechaFormateada}}', description: 'Fecha formateada (ej: 5 de febrero de 2026)' },
        { key: '{{venta.total}}', description: 'Total de la venta (número)' },
        { key: '{{venta.totalFormateado}}', description: 'Total formateado en Gs.' },
        { key: '{{venta.vendedor}}', description: 'Nombre del vendedor' },
        { key: '{{venta.numeroContrato}}', description: 'Número de contrato' },
        { key: '{{venta.numeroSolicitud}}', description: 'Número de solicitud' },
        { key: '{{venta.estado}}', description: 'Estado de la venta' },
        { key: '{{venta.cantidadAdherentes}}', description: 'Cantidad de adherentes' },
        { key: '{{venta.fechaInicioContrato}}', description: 'Fecha inicio contrato (dd/MM/yyyy) - 1er día del mes de aprobación' },
        { key: '{{venta.fechaInicioContratoFormateada}}', description: 'Fecha inicio contrato formateada' },
      ],
    },
    {
      category: 'Facturación',
      variables: [
        { key: '{{facturacion.razonSocial}}', description: 'Razón Social para facturación' },
        { key: '{{facturacion.ruc}}', description: 'R.U.C. para facturación' },
        { key: '{{facturacion.email}}', description: 'Email de facturación' },
        { key: '{{facturacion.telefono}}', description: 'Teléfono de facturación' },
      ],
    },
    {
      category: 'Firma Digital',
      variables: [
        { key: '{{firma.enlace}}', description: 'Enlace para firma digital' },
        { key: '{{firma.fechaExpiracion}}', description: 'Fecha de expiración del enlace' },
        { key: '{{firma.estado}}', description: 'Estado de la firma' },
      ],
    },
    {
      category: 'Fecha y Hora',
      variables: [
        { key: '{{fecha.actual}}', description: 'Fecha actual (yyyy-MM-dd)' },
        { key: '{{fecha.actualFormateada}}', description: 'Fecha actual formateada' },
        { key: '{{fecha.horaActual}}', description: 'Hora actual (HH:mm)' },
        { key: '{{fecha.anio}}', description: 'Año actual' },
        { key: '{{fecha.mes}}', description: 'Mes actual (nombre)' },
        { key: '{{fecha.dia}}', description: 'Día actual' },
      ],
    },
    {
      category: 'Beneficiario Principal',
      variables: [
        { key: '{{titular.nombre}}', description: 'Nombre del titular' },
        { key: '{{titular.apellido}}', description: 'Apellido del titular' },
        { key: '{{titular.nombreCompleto}}', description: 'Nombre completo del titular' },
        { key: '{{titular.dni}}', description: 'DNI del titular' },
        { key: '{{titular.edad}}', description: 'Edad del titular' },
        { key: '{{titular.montoFormateado}}', description: 'Monto de cobertura del titular' },
      ],
    },
    {
      category: 'Lista de Beneficiarios',
      variables: [
        { key: '{{#beneficiarios}}...{{/beneficiarios}}', description: 'Loop para listar todos los beneficiarios' },
        { key: '{{indice}}', description: 'Número del beneficiario (dentro del loop)' },
        { key: '{{nombreCompleto}}', description: 'Nombre completo (dentro del loop)' },
        { key: '{{parentesco}}', description: 'Parentesco (dentro del loop)' },
        { key: '{{edad}}', description: 'Edad (dentro del loop)' },
        { key: '{{montoFormateado}}', description: 'Monto de cobertura (dentro del loop)' },
      ],
    },
  ];
}

/**
 * Generate beneficiaries table HTML
 */
export function generateBeneficiariesTable(beneficiaries: BeneficiaryContext[]): string {
  if (beneficiaries.length === 0) return '';

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">#</th>
          <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Nombre</th>
          <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Documento</th>
          <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Parentesco</th>
          <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Edad</th>
          <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Cobertura</th>
        </tr>
      </thead>
      <tbody>
        ${beneficiaries.map((b, i) => `
          <tr>
            <td style="border: 1px solid #e5e7eb; padding: 10px;">${i + 1}</td>
            <td style="border: 1px solid #e5e7eb; padding: 10px;">${b.nombreCompleto}</td>
            <td style="border: 1px solid #e5e7eb; padding: 10px;">${b.dni}</td>
            <td style="border: 1px solid #e5e7eb; padding: 10px;">${b.parentesco}</td>
            <td style="border: 1px solid #e5e7eb; padding: 10px;">${b.edad} años</td>
            <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: right;">${b.montoFormateado}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="background-color: #f9fafb; font-weight: bold;">
          <td colspan="5" style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Total Cobertura:</td>
          <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">
            ${formatCurrency(beneficiaries.reduce((sum, b) => sum + b.monto, 0))}
          </td>
        </tr>
      </tfoot>
    </table>
  `;
}
