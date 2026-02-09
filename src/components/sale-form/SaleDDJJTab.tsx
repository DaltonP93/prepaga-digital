
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, HeartPulse, CheckCircle, Clock, Save } from 'lucide-react';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SaleDDJJTabProps {
  saleId?: string;
}

const HEALTH_QUESTIONS = [
  '1. ¿Padece alguna enfermedad crónica (diabetes, hipertensión, asma, EPOC, reumatológicas, tiroideas, insuficiencia renal u otras)?',
  '2. ¿Padece o ha padecido alguna enfermedad o trastorno mental o neurológico (ansiedad, depresión, convulsiones u otros)?',
  '3. ¿Padece o ha padecido enfermedad cardiovascular o coronaria, o se ha sometido a procedimientos (marcapasos, bypass, cateterismo, etc.)?',
  '4. ¿Posee o ha poseído quistes, tumores o enfermedades oncológicas que hayan requerido cirugía, quimioterapia o radioterapia?',
  '5. ¿Ha sido internado/a o sometido/a a alguna cirugía?',
  '6. ¿Consume medicamentos, sustancias o se somete a tratamientos, de origen médico, natural o experimental?',
  '7. Otras enfermedades o condiciones no mencionadas',
];

const HABITS = ['Fuma', 'Vapea', 'Consume bebidas alcohólicas'];

interface BeneficiaryHealthData {
  peso: string;
  altura: string;
  answers: ('si' | 'no' | '')[];
  details: string[];
  habits: boolean[];
  lastMenstruation: string;
}

const createEmptyData = (): BeneficiaryHealthData => ({
  peso: '',
  altura: '',
  answers: new Array(HEALTH_QUESTIONS.length).fill(''),
  details: new Array(HEALTH_QUESTIONS.length).fill(''),
  habits: new Array(HABITS.length).fill(false),
  lastMenstruation: '',
});

const SaleDDJJTab: React.FC<SaleDDJJTabProps> = ({ saleId }) => {
  const { data: beneficiaries, isLoading } = useBeneficiaries(saleId || '');
  const queryClient = useQueryClient();
  const [healthData, setHealthData] = useState<Record<string, BeneficiaryHealthData>>({});

  const getData = (id: string) => healthData[id] || createEmptyData();

  const update = (id: string, patch: Partial<BeneficiaryHealthData>) => {
    setHealthData(prev => ({
      ...prev,
      [id]: { ...getData(id), ...prev[id], ...patch },
    }));
  };

  const setAnswer = (id: string, idx: number, val: 'si' | 'no') => {
    const d = getData(id);
    const answers = [...d.answers];
    answers[idx] = val;
    update(id, { answers });
  };

  const setDetail = (id: string, idx: number, val: string) => {
    const d = getData(id);
    const details = [...d.details];
    details[idx] = val;
    update(id, { details });
  };

  const toggleHabit = (id: string, idx: number) => {
    const d = getData(id);
    const habits = [...d.habits];
    habits[idx] = !habits[idx];
    update(id, { habits });
  };

  const saveMutation = useMutation({
    mutationFn: async (beneficiaryId: string) => {
      const d = getData(beneficiaryId);
      const hasPreexisting = d.answers.some(a => a === 'si') || d.habits.some(h => h);

      const detailParts: string[] = [];
      HEALTH_QUESTIONS.forEach((q, i) => {
        if (d.answers[i] === 'si') {
          detailParts.push(`${q}: ${d.details[i] || 'Sí'}`);
        }
      });
      const activeHabits = HABITS.filter((_, i) => d.habits[i]);
      if (activeHabits.length) detailParts.push(`Hábitos: ${activeHabits.join(', ')}`);
      if (d.lastMenstruation) detailParts.push(`Última menstruación/embarazo: ${d.lastMenstruation}`);
      if (d.peso) detailParts.push(`Peso: ${d.peso} kg`);
      if (d.altura) detailParts.push(`Estatura: ${d.altura} cm`);

      const { error } = await supabase
        .from('beneficiaries')
        .update({
          has_preexisting_conditions: hasPreexisting,
          preexisting_conditions_detail: hasPreexisting ? detailParts.join('; ') : null,
        })
        .eq('id', beneficiaryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      toast.success('DDJJ de Salud guardada correctamente');
    },
    onError: (e: any) => toast.error(e.message || 'Error al guardar'),
  });

  if (!saleId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Guarde la venta primero</h3>
        <p className="text-muted-foreground">Debe guardar la venta antes de gestionar las DDJJ de Salud.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando datos de salud...</div>;
  }

  const allBeneficiaries = beneficiaries || [];

  if (allBeneficiaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2" />
        No hay adherentes registrados. Agregue adherentes en la pestaña correspondiente para completar las DDJJ de salud.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <HeartPulse className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Declaración Jurada de Salud - SAMAP</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Complete la declaración jurada de salud para cada miembro del grupo familiar. Responda SÍ o NO y justifique cuando corresponda.
      </p>

      {allBeneficiaries.map((b) => {
        const d = healthData[b.id] || createEmptyData();
        const hasAny = d.answers.some(a => a === 'si') || d.habits.some(h => h);

        return (
          <Card key={b.id} className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {b.has_preexisting_conditions ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <CardTitle className="text-base">{b.first_name} {b.last_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {b.relationship || 'Titular'} {b.dni ? `• C.I.: ${b.dni}` : ''}
                    </p>
                  </div>
                </div>
                <Badge variant={hasAny || b.has_preexisting_conditions ? 'destructive' : 'default'}>
                  {hasAny || b.has_preexisting_conditions ? 'Con preexistencias' : 'Sin preexistencias'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Health Questions - Si/No */}
              {HEALTH_QUESTIONS.map((question, idx) => (
                <div key={idx} className="space-y-2 border-b pb-4 last:border-b-0">
                  <Label className="text-sm font-medium leading-tight">{question}</Label>
                  <RadioGroup
                    value={d.answers[idx] || ''}
                    onValueChange={(val) => setAnswer(b.id, idx, val as 'si' | 'no')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="si" id={`${b.id}-q${idx}-si`} />
                      <Label htmlFor={`${b.id}-q${idx}-si`} className="cursor-pointer font-normal">SÍ</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`${b.id}-q${idx}-no`} />
                      <Label htmlFor={`${b.id}-q${idx}-no`} className="cursor-pointer font-normal">NO</Label>
                    </div>
                  </RadioGroup>
                  {d.answers[idx] === 'si' && (
                    <Textarea
                      placeholder="Especificar..."
                      value={d.details[idx] || ''}
                      onChange={(e) => setDetail(b.id, idx, e.target.value)}
                      className="text-sm"
                      rows={2}
                    />
                  )}
                </div>
              ))}

              {/* Habits */}
              <div className="space-y-2 border-b pb-4">
                <Label className="text-sm font-medium">Hábitos:</Label>
                <div className="flex flex-wrap gap-4">
                  {HABITS.map((habit, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${b.id}-habit-${idx}`}
                        checked={d.habits[idx] || false}
                        onCheckedChange={() => toggleHabit(b.id, idx)}
                      />
                      <label htmlFor={`${b.id}-habit-${idx}`} className="text-sm cursor-pointer">
                        {habit}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last menstruation */}
              <div className="space-y-2 border-b pb-4">
                <Label className="text-sm font-medium">Fecha de última menstruación o embarazo (si corresponde):</Label>
                <Input
                  type="text"
                  placeholder="Ej: 15/01/2026 o N/A"
                  value={d.lastMenstruation}
                  onChange={(e) => update(b.id, { lastMenstruation: e.target.value })}
                />
              </div>

              {/* Physical metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 70"
                    value={d.peso}
                    onChange={(e) => update(b.id, { peso: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Estatura (cm)</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 170"
                    value={d.altura}
                    onChange={(e) => update(b.id, { altura: e.target.value })}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Declaro que los datos precedentes son fieles a la verdad y me comprometo a informar cualquier modificación en mi estado de salud.
              </p>

              <Button
                onClick={() => saveMutation.mutate(b.id)}
                disabled={saveMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar DDJJ de {b.first_name}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SaleDDJJTab;
