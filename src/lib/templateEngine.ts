
// Template Engine for dynamic document generation
export interface TemplateVariable {
  key: string;
  value: string | number | Date;
}

export interface TemplateContext {
  cliente: {
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string;
    dni?: string;
    direccion?: string;
    fecha_nacimiento?: string;
  };
  plan: {
    nombre: string;
    precio: number;
    descripcion?: string;
    cobertura?: string;
  };
  empresa: {
    nombre: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  };
  venta: {
    fecha: string;
    total: number;
    vendedor?: string;
    notas?: string;
  };
  fecha: {
    actual: string;
    vencimiento?: string;
  };
}

export const createTemplateContext = (
  client: any,
  plan: any,
  company: any,
  sale: any
): TemplateContext => {
  return {
    cliente: {
      nombre: client?.first_name || '',
      apellido: client?.last_name || '',
      email: client?.email || '',
      telefono: client?.phone || '',
      dni: client?.dni || '',
      direccion: client?.address || '',
      fecha_nacimiento: client?.birth_date || '',
    },
    plan: {
      nombre: plan?.name || '',
      precio: plan?.price || 0,
      descripcion: plan?.description || '',
      cobertura: plan?.coverage_details || '',
    },
    empresa: {
      nombre: company?.name || '',
      email: company?.email || '',
      telefono: company?.phone || '',
      direccion: company?.address || '',
    },
    venta: {
      fecha: sale?.sale_date ? new Date(sale.sale_date).toLocaleDateString() : new Date().toLocaleDateString(),
      total: sale?.total_amount || 0,
      vendedor: sale?.salesperson ? `${sale.salesperson.first_name} ${sale.salesperson.last_name}` : '',
      notas: sale?.notes || '',
    },
    fecha: {
      actual: new Date().toLocaleDateString(),
      vencimiento: sale?.signature_expires_at ? new Date(sale.signature_expires_at).toLocaleDateString() : '',
    },
  };
};

export const interpolateTemplate = (template: string, context: TemplateContext): string => {
  let result = template;

  // Replace nested object variables like {{cliente.nombre}}
  const replaceNestedVariables = (obj: any, prefix: string) => {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const placeholder = `{{${prefix}.${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      
      if (value !== null && value !== undefined) {
        result = result.replace(regex, String(value));
      } else {
        result = result.replace(regex, '');
      }
    });
  };

  // Process all nested objects
  replaceNestedVariables(context.cliente, 'cliente');
  replaceNestedVariables(context.plan, 'plan');
  replaceNestedVariables(context.empresa, 'empresa');
  replaceNestedVariables(context.venta, 'venta');
  replaceNestedVariables(context.fecha, 'fecha');

  // Handle special formatting for currency
  result = result.replace(/\{\{precio_formateado\}\}/g, `$${context.plan.precio.toLocaleString()}`);
  result = result.replace(/\{\{total_formateado\}\}/g, `$${context.venta.total.toLocaleString()}`);

  return result;
};

export const getAvailableVariables = (): string[] => {
  return [
    '{{cliente.nombre}}',
    '{{cliente.apellido}}',
    '{{cliente.email}}',
    '{{cliente.telefono}}',
    '{{cliente.dni}}',
    '{{cliente.direccion}}',
    '{{cliente.fecha_nacimiento}}',
    '{{plan.nombre}}',
    '{{plan.precio}}',
    '{{plan.descripcion}}',
    '{{plan.cobertura}}',
    '{{empresa.nombre}}',
    '{{empresa.email}}',
    '{{empresa.telefono}}',
    '{{empresa.direccion}}',
    '{{venta.fecha}}',
    '{{venta.total}}',
    '{{venta.vendedor}}',
    '{{venta.notas}}',
    '{{fecha.actual}}',
    '{{fecha.vencimiento}}',
    '{{precio_formateado}}',
    '{{total_formateado}}',
  ];
};
