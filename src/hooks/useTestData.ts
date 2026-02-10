import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";

export const useTestData = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { profile } = useSimpleAuthContext();

  const createTestData = async () => {
    if (!profile?.company_id) {
      toast({
        title: "Error",
        description:
          "No se puede crear datos de prueba sin una empresa asociada.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // 1. Create test clients (with required company_id)
      const clientsData = [
        {
          first_name: "María",
          last_name: "García",
          email: "maria.garcia@email.com",
          phone: "+34 123 456 789",
          dni: "12345678A",
          address: "Calle Mayor 123, Madrid",
          company_id: profile.company_id,
        },
        {
          first_name: "Juan",
          last_name: "Rodríguez",
          email: "juan.rodriguez@email.com",
          phone: "+34 987 654 321",
          dni: "87654321B",
          address: "Avenida España 456, Barcelona",
          company_id: profile.company_id,
        },
        {
          first_name: "Ana",
          last_name: "López",
          email: "ana.lopez@email.com",
          phone: "+34 555 666 777",
          dni: "11223344C",
          address: "Plaza Central 789, Valencia",
          company_id: profile.company_id,
        },
      ];

      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .insert(clientsData)
        .select();

      if (clientsError) throw clientsError;

      // 2. Create test plans (matching actual schema)
      const plansData = [
        {
          name: "Plan Básico",
          description: "Cobertura básica para necesidades estándar",
          price: 99.99,
          coverage_details: {
            items: [
              "Consultas médicas",
              "Urgencias 24h",
              "Medicamentos básicos",
            ],
          },
          company_id: profile.company_id,
        },
        {
          name: "Plan Premium",
          description: "Cobertura completa con servicios adicionales",
          price: 199.99,
          coverage_details: {
            items: [
              "Todo del plan básico",
              "Especialistas",
              "Cirugías",
              "Hospitalización",
            ],
          },
          company_id: profile.company_id,
        },
        {
          name: "Plan Familiar",
          description: "Cobertura familiar para hasta 4 miembros",
          price: 299.99,
          coverage_details: {
            items: ["Todo del plan premium", "Cobertura familiar completa"],
          },
          company_id: profile.company_id,
        },
      ];

      const { data: plans, error: plansError } = await supabase
        .from("plans")
        .insert(plansData)
        .select();

      if (plansError) throw plansError;

      // 3. Create test templates (matching actual schema)
      const templatesData = [
        {
          name: "Contrato Estándar",
          description: "Template de contrato estándar para todos los planes",
          content: JSON.stringify({
            title: "CONTRATO DE SERVICIOS DE SALUD",
            sections: [
              {
                title: "DATOS DEL CONTRATANTE",
                content:
                  "Nombre: {{cliente.nombre}} {{cliente.apellido}}\nDNI: {{cliente.dni}}",
              },
              {
                title: "PLAN CONTRATADO",
                content: "Plan: {{plan.nombre}}\nPrecio: {{precio_formateado}}",
              },
            ],
          }),
          company_id: profile.company_id,
          created_by: profile.id,
        },
      ];

      const { data: templates, error: templatesError } = await supabase
        .from("templates")
        .insert(templatesData)
        .select();

      if (templatesError) throw templatesError;

      // 4. Create test sales (matching actual schema - no sale_date field)
      const salesData = [
        {
          client_id: clients[0].id,
          plan_id: plans[0].id,
          company_id: profile.company_id,
          salesperson_id: profile.id,
          total_amount: plans[0].price,
          status: "borrador" as const,
          notes: "Cliente interesado en el plan básico",
        },
        {
          client_id: clients[1].id,
          plan_id: plans[1].id,
          company_id: profile.company_id,
          salesperson_id: profile.id,
          total_amount: plans[1].price,
          status: "enviado" as const,
          notes: "Enviado para firma el día de hoy",
        },
      ];

      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .insert(salesData)
        .select();

      if (salesError) throw salesError;

      // 5. Create documents (matching actual schema)
      const documentsData = [
        {
          name: "Contrato Plan Básico",
          content: `<h1>CONTRATO DE SERVICIOS</h1><p>Cliente: ${clients[0].first_name} ${clients[0].last_name}</p>`,
          sale_id: sales[0].id,
          document_type: "contract",
        },
        {
          name: "Contrato Plan Premium",
          content: `<h1>CONTRATO DE SERVICIOS</h1><p>Cliente: ${clients[1].first_name} ${clients[1].last_name}</p>`,
          sale_id: sales[1].id,
          document_type: "contract",
        },
      ];

      const { error: documentsError } = await supabase
        .from("documents")
        .insert(documentsData);

      if (documentsError) throw documentsError;

      toast({
        title: "Datos de prueba creados",
        description: `Se han creado ${clients.length} clientes, ${plans.length} planes, ${templates.length} templates, ${sales.length} ventas y ${documentsData.length} documentos de prueba.`,
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error creating test data:", error);
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
