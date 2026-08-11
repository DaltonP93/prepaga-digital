import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DynamicQuestionnaire } from '@/components/DynamicQuestionnaire';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SalePlanFieldsTabProps {
  saleId?: string;
  /** Template de campos personalizados que corresponde al PLAN de la venta. */
  templateId?: string;
  templateName?: string;
  disabled?: boolean;
}

/**
 * Pestaña "Campos del Plan": el vendedor completa manualmente los campos
 * personalizados (template_questions) que exige el plan de la venta.
 *
 * Solo se monta cuando el PLAN seleccionado tiene un template homónimo con
 * preguntas configuradas (ej. "Plan Materno"); esa decisión vive en
 * SaleTabbedForm. Guarda en template_responses mediante DynamicQuestionnaire;
 * el motor de generación las fusiona en el documento vía
 * {{respuestas.<placeholder_name>}}.
 */
const SalePlanFieldsTab: React.FC<SalePlanFieldsTabProps> = ({
  saleId,
  templateId,
  templateName,
  disabled,
}) => {
  const queryClient = useQueryClient();

  if (!saleId) {
    return (
      <p className="text-sm text-muted-foreground">
        Guardá la venta primero para poder cargar los campos del plan.
      </p>
    );
  }

  if (!templateId) {
    return (
      <p className="text-sm text-muted-foreground">
        El plan seleccionado no requiere campos adicionales.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{templateName || 'Campos del Plan'}</CardTitle>
      </CardHeader>
      <CardContent>
        <DynamicQuestionnaire
          templateId={templateId}
          saleId={saleId}
          readOnly={disabled}
          // Al guardar, recalcular los campos obligatorios pendientes para que
          // se libere (o no) el avance de estado sin recargar la página.
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['plan-fields-missing'] });
          }}
        />
      </CardContent>
    </Card>
  );
};

export default SalePlanFieldsTab;
