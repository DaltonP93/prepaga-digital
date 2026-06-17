import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DynamicQuestionnaire } from '@/components/DynamicQuestionnaire';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SalePlanFieldsTabProps {
  saleId?: string;
  disabled?: boolean;
}

/**
 * Pestaña "Campos del Plan": permite al vendedor completar manualmente los campos
 * personalizados (template_questions) de los templates asociados a esta venta.
 *
 * Es completamente ADITIVA e INERTE: si la venta no tiene ningún template con
 * preguntas configuradas, este componente no muestra nada (y la pestaña ni siquiera
 * aparece, ver SaleTabbedForm). Reutiliza el componente existente DynamicQuestionnaire,
 * que guarda en template_responses; el motor de generación ya fusiona esas respuestas
 * en el documento vía {{respuestas.<placeholder_name>}}.
 */
const SalePlanFieldsTab: React.FC<SalePlanFieldsTabProps> = ({ saleId, disabled }) => {
  const { data: templatesWithQuestions = [], isLoading } = useQuery({
    queryKey: ['sale-plan-fields', saleId],
    queryFn: async () => {
      if (!saleId) return [] as { id: string; name: string }[];

      // Templates asociados a esta venta
      const { data: st, error: stErr } = await supabase
        .from('sale_templates')
        .select('template_id, templates:template_id(id, name)')
        .eq('sale_id', saleId);
      if (stErr) throw stErr;

      const attached = (st || [])
        .map((r: any) => ({ id: r.templates?.id || r.template_id, name: r.templates?.name || 'Template' }))
        .filter((t: any) => !!t.id);
      const ids = Array.from(new Set(attached.map((t) => t.id)));
      if (ids.length === 0) return [];

      // Cuáles de esos templates tienen preguntas configuradas
      const { data: q, error: qErr } = await supabase
        .from('template_questions')
        .select('template_id')
        .in('template_id', ids);
      if (qErr) throw qErr;

      const withQuestions = new Set((q || []).map((x: any) => x.template_id));
      return attached
        .filter((t) => withQuestions.has(t.id))
        .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
    },
    enabled: !!saleId,
  });

  if (!saleId) {
    return <p className="text-sm text-muted-foreground">Guardá la venta primero para cargar los campos del plan.</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando campos...</p>;
  }

  if (templatesWithQuestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este tipo de venta no requiere campos adicionales para completar.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {templatesWithQuestions.map((t) => (
        <Card key={t.id}>
          <CardHeader>
            <CardTitle className="text-base">{t.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicQuestionnaire templateId={t.id} saleId={saleId} readOnly={disabled} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SalePlanFieldsTab;
