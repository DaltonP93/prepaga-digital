
import { formatCurrency } from "@/lib/utils";

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
  respuestas: Record<string, unknown>;
}

export const createTemplateContext = (
  client: Record<string, unknown>,
  plan: Record<string, unknown>,
  company: Record<string, unknown>,
  sale: Record<string, unknown>,
  responses?: Record<string, unknown>
): TemplateContext => {
  return {
    cliente: {
      nombre: (client?.first_name as string | undefined) || '',
      apellido: (client?.last_name as string | undefined) || '',
      email: (client?.email as string | undefined) || '',
      telefono: (client?.phone as string | undefined) || '',
      dni: (client?.dni as string | undefined) || '',
      direccion: (client?.address as string | undefined) || '',
      fecha_nacimiento: (client?.birth_date as string | undefined) || '',
    },
    plan: {
      nombre: (plan?.name as string | undefined) || '',
      precio: (plan?.price as number | undefined) || 0,
      descripcion: (plan?.description as string | undefined) || '',
      cobertura: (plan?.coverage_details as string | undefined) || '',
    },
    empresa: {
      nombre: (company?.name as string | undefined) || '',
      email: (company?.email as string | undefined) || '',
      telefono: (company?.phone as string | undefined) || '',
      direccion: (company?.address as string | undefined) || '',
    },
    venta: {
      fecha: sale?.sale_date ? new Date(sale.sale_date as string).toLocaleDateString() : new Date().toLocaleDateString(),
      total: (sale?.total_amount as number | undefined) || 0,
      vendedor: sale?.salesperson ? `${(sale.salesperson as Record<string, unknown>).first_name} ${(sale.salesperson as Record<string, unknown>).last_name}` : '',
      notas: (sale?.notes as string | undefined) || '',
    },
    fecha: {
      actual: new Date().toLocaleDateString(),
      vencimiento: sale?.signature_expires_at ? new Date(sale.signature_expires_at as string).toLocaleDateString() : '',
    },
    respuestas: responses || {},
  };
};

export const interpolateTemplate = (template: string, context: TemplateContext): string => {
  let result = template;

  // Replace nested object variables like {{cliente.nombre}}
  const replaceNestedVariables = (obj: Record<string, unknown>, prefix: string) => {
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
  replaceNestedVariables(context.respuestas, 'respuestas');

  // Handle special formatting for currency
  result = result.replace(/\{\{precio_formateado\}\}/g, formatCurrency(context.plan.precio));
  result = result.replace(/\{\{total_formateado\}\}/g, formatCurrency(context.venta.total));

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
    '{{respuestas.[pregunta_id]}}',
  ];
};

// Helper function to generate document content with questionnaire responses
export const generateDocumentWithResponses = (
  template: unknown,
  context: TemplateContext,
  responses: Record<string, unknown>
): string => {
  // Create enhanced context with responses
  const enhancedContext = {
    ...context,
    respuestas: responses,
  };

  // If template has questionnaire content, generate it
  if (template.content && template.content.questionnaire) {
    let questionnaireContent = '\n\n--- CUESTIONARIO DE DECLARACIÓN JURADA ---\n\n';
    
    Object.entries(responses).forEach(([questionId, answer]) => {
      const questionText = template.content.questionnaire[questionId]?.text || `Pregunta ${questionId}`;
      questionnaireContent += `${questionText}\nRespuesta: ${answer}\n\n`;
    });

    // Add questionnaire content to template
    if (typeof template.content === 'string') {
      template.content += questionnaireContent;
    } else if (template.content && typeof template.content === 'object') {
      template.content.questionnaire_responses = questionnaireContent;
    }
  }

  return interpolateTemplate(JSON.stringify(template.content), enhancedContext);
};
