
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';

export const useTestData = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuthContext();

  const createTestData = async () => {
    if (!profile?.company_id) {
      toast({
        title: "Error",
        description: "No se puede crear datos de prueba sin una empresa asociada.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // 1. Crear clientes de prueba
      const clientsData = [
        {
          first_name: 'María',
          last_name: 'García',
          email: 'maria.garcia@email.com',
          phone: '+34 123 456 789',
          dni: '12345678A',
          address: 'Calle Mayor 123, Madrid'
        },
        {
          first_name: 'Juan',
          last_name: 'Rodríguez',
          email: 'juan.rodriguez@email.com',
          phone: '+34 987 654 321',
          dni: '87654321B',
          address: 'Avenida España 456, Barcelona'
        },
        {
          first_name: 'Ana',
          last_name: 'López',
          email: 'ana.lopez@email.com',
          phone: '+34 555 666 777',
          dni: '11223344C',
          address: 'Plaza Central 789, Valencia'
        }
      ];

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .insert(clientsData)
        .select();

      if (clientsError) throw clientsError;

      // 2. Crear planes de prueba
      const plansData = [
        {
          name: 'Plan Básico',
          description: 'Cobertura básica para necesidades estándar',
          price: 99.99,
          coverage_details: 'Cobertura básica incluye: consultas médicas, urgencias 24h, medicamentos básicos',
          company_id: profile.company_id,
          created_by: profile.id
        },
        {
          name: 'Plan Premium',
          description: 'Cobertura completa con servicios adicionales',
          price: 199.99,
          coverage_details: 'Cobertura premium incluye: todo lo del plan básico + especialistas, cirugías, hospitalización',
          company_id: profile.company_id,
          created_by: profile.id
        },
        {
          name: 'Plan Familiar',
          description: 'Cobertura familiar para hasta 4 miembros',
          price: 299.99,
          coverage_details: 'Cobertura familiar incluye: todo lo del plan premium para toda la familia',
          company_id: profile.company_id,
          created_by: profile.id
        }
      ];

      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .insert(plansData)
        .select();

      if (plansError) throw plansError;

      // 3. Crear templates de documentos de prueba
      const templatesData = [
        {
          name: 'Contrato Estándar',
          description: 'Template de contrato estándar para todos los planes',
          content: {
            title: 'CONTRATO DE SERVICIOS DE SALUD',
            sections: [
              {
                title: 'DATOS DEL CONTRATANTE',
                content: 'Nombre: {{cliente.nombre}} {{cliente.apellido}}\nDNI: {{cliente.dni}}\nEmail: {{cliente.email}}\nTeléfono: {{cliente.telefono}}'
              },
              {
                title: 'PLAN CONTRATADO',
                content: 'Plan: {{plan.nombre}}\nPrecio: {{precio_formateado}}\nDescripción: {{plan.descripcion}}'
              },
              {
                title: 'TÉRMINOS Y CONDICIONES',
                content: 'Este contrato entra en vigor a partir de {{fecha.actual}} y tiene validez por un período de 12 meses. El cliente se compromete al pago mensual de {{precio_formateado}}.'
              }
            ]
          },
          is_global: false,
          company_id: profile.company_id,
          created_by: profile.id
        }
      ];

      const { data: templates, error: templatesError } = await supabase
        .from('templates')
        .insert(templatesData)
        .select();

      if (templatesError) throw templatesError;

      // 4. Crear ventas de prueba en diferentes estados
      const salesData = [
        {
          client_id: clients[0].id,
          plan_id: plans[0].id,
          company_id: profile.company_id,
          salesperson_id: profile.id,
          total_amount: plans[0].price,
          status: 'borrador' as const,
          notes: 'Cliente interesado en el plan básico',
          sale_date: new Date().toISOString()
        },
        {
          client_id: clients[1].id,
          plan_id: plans[1].id,
          company_id: profile.company_id,
          salesperson_id: profile.id,
          total_amount: plans[1].price,
          status: 'enviado' as const,
          notes: 'Enviado para firma el día de hoy',
          sale_date: new Date().toISOString()
        }
      ];

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .insert(salesData)
        .select();

      if (salesError) throw salesError;

      // 5. Crear documentos asociados a las ventas
      const documentsData = [
        {
          name: 'Contrato Plan Básico',
          content: `
            <h1>CONTRATO DE SERVICIOS DE SALUD</h1>
            <h2>DATOS DEL CONTRATANTE</h2>
            <p><strong>Nombre:</strong> ${clients[0].first_name} ${clients[0].last_name}</p>
            <p><strong>DNI:</strong> ${clients[0].dni}</p>
            <p><strong>Email:</strong> ${clients[0].email}</p>
            <p><strong>Teléfono:</strong> ${clients[0].phone}</p>
            
            <h2>PLAN CONTRATADO</h2>
            <p><strong>Plan:</strong> ${plans[0].name}</p>
            <p><strong>Precio:</strong> €${plans[0].price}</p>
            <p><strong>Descripción:</strong> ${plans[0].description}</p>
            
            <h2>TÉRMINOS Y CONDICIONES</h2>
            <p>Este contrato entra en vigor a partir de la fecha de firma y tiene validez por un período de 12 meses.</p>
            <p>El cliente se compromete al pago mensual de €${plans[0].price}.</p>
          `,
          sale_id: sales[0].id,
          template_id: templates[0].id,
          plan_id: plans[0].id,
          is_required: true,
          order_index: 1
        },
        {
          name: 'Contrato Plan Premium',
          content: `
            <h1>CONTRATO DE SERVICIOS DE SALUD</h1>
            <h2>DATOS DEL CONTRATANTE</h2>
            <p><strong>Nombre:</strong> ${clients[1].first_name} ${clients[1].last_name}</p>
            <p><strong>DNI:</strong> ${clients[1].dni}</p>
            <p><strong>Email:</strong> ${clients[1].email}</p>
            <p><strong>Teléfono:</strong> ${clients[1].phone}</p>
            
            <h2>PLAN CONTRATADO</h2>
            <p><strong>Plan:</strong> ${plans[1].name}</p>
            <p><strong>Precio:</strong> €${plans[1].price}</p>
            <p><strong>Descripción:</strong> ${plans[1].description}</p>
            
            <h2>TÉRMINOS Y CONDICIONES</h2>
            <p>Este contrato entra en vigor a partir de la fecha de firma y tiene validez por un período de 12 meses.</p>
            <p>El cliente se compromete al pago mensual de €${plans[1].price}.</p>
          `,
          sale_id: sales[1].id,
          template_id: templates[0].id,
          plan_id: plans[1].id,
          is_required: true,
          order_index: 1
        }
      ];

      const { error: documentsError } = await supabase
        .from('documents')
        .insert(documentsData);

      if (documentsError) throw documentsError;

      toast({
        title: "Datos de prueba creados",
        description: `Se han creado ${clients.length} clientes, ${plans.length} planes, ${templates.length} templates, ${sales.length} ventas y ${documentsData.length} documentos de prueba.`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error creating test data:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron crear los datos de prueba.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTestData,
    isCreating,
  };
};
