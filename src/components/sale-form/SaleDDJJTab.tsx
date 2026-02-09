
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, HeartPulse, CheckCircle, Clock, Save } from 'lucide-react';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SaleDDJJTabProps {
  saleId?: string;
}

const HEALTH_CATEGORIES = [
  'Sistema Respiratorio (asma, bronquitis, EPOC, tuberculosis)',
  'Sistema Cardiovascular (hipertensión, arritmias, infarto, soplos)',
  'Sistema Digestivo (úlceras, gastritis, hepatitis, colitis)',
  'Sistema Urinario (cálculos renales, infecciones urinarias, insuficiencia renal)',
  'Sistema Nervioso (epilepsia, migrañas, ACV, convulsiones)',
  'Sistema Endocrino (diabetes, tiroides, obesidad)',
  'Sistema Músculo-Esquelético (artritis, artrosis, hernias de disco, fracturas)',
  'Enfermedades Oncológicas (tumores, cáncer, quimioterapia)',
  'Enfermedades de la Sangre (anemia, leucemia, problemas de coagulación)',
  'Enfermedades Dermatológicas (psoriasis, dermatitis, alergias cutáneas)',
  'Enfermedades Oftalmológicas (glaucoma, cataratas, desprendimiento de retina)',
  'Enfermedades ORL (sinusitis crónica, otitis, desviación de tabique)',
  'Cirugías realizadas (cualquier intervención quirúrgica previa)',
  'Internaciones previas (hospitalizaciones por cualquier causa)',
  'Tratamiento psicológico/psiquiátrico (depresión, ansiedad, adicciones)',
  'Enfermedades ginecológicas/urológicas (endometriosis, próstata, etc.)',
];

interface BeneficiaryHealthData {
  peso: string;
  altura: string;
  conditions: boolean[];
  details: string[];
}

const SaleDDJJTab: React.FC<SaleDDJJTabProps> = ({ saleId }) => {
  const { data: beneficiaries, isLoading } = useBeneficiaries(saleId || '');
  const queryClient = useQueryClient();
  const [healthData, setHealthData] = useState<Record<string, BeneficiaryHealthData>>({});

  const initBeneficiaryData = (beneficiaryId: string): BeneficiaryHealthData => {
    if (healthData[beneficiaryId]) return healthData[beneficiaryId];
    return {
      peso: '',
      altura: '',
      conditions: new Array(HEALTH_CATEGORIES.length).fill(false),
      details: new Array(HEALTH_CATEGORIES.length).fill(''),
    };
  };

  const updateHealthData = (beneficiaryId: string, data: Partial<BeneficiaryHealthData>) => {
    setHealthData(prev => ({
      ...prev,
      [beneficiaryId]: { ...initBeneficiaryData(beneficiaryId), ...prev[beneficiaryId], ...data },
    }));
  };

  const toggleCondition = (beneficiaryId: string, index: number) => {
    const current = healthData[beneficiaryId] || initBeneficiaryData(beneficiaryId);
    const newConditions = [...current.conditions];
    newConditions[index] = !newConditions[index];
    updateHealthData(beneficiaryId, { conditions: newConditions });
  };

  const updateDetail = (beneficiaryId: string, index: number, value: string) => {
    const current = healthData[beneficiaryId] || initBeneficiaryData(beneficiaryId);
    const newDetails = [...current.details];
    newDetails[index] = value;
    updateHealthData(beneficiaryId, { details: newDetails });
  };

  const saveMutation = useMutation({
    mutationFn: async (beneficiaryId: string) => {
      const data = healthData[beneficiaryId] || initBeneficiaryData(beneficiaryId);
      const hasPreexisting = data.conditions.some(c => c);
      const detailText = HEALTH_CATEGORIES
        .map((cat, i) => data.conditions[i] ? `${cat}: ${data.details[i] || 'Sí'}` : null)
        .filter(Boolean)
        .join('; ');

      const { error } = await supabase
        .from('beneficiaries')
        .update({
          has_preexisting_conditions: hasPreexisting,
          preexisting_conditions_detail: hasPreexisting ? detailText : null,
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
        <h3 className="text-lg font-semibold">Declaración Jurada de Salud</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Complete la declaración jurada de salud para cada miembro del grupo familiar. Marque las categorías que apliquen y agregue detalles.
      </p>

      {allBeneficiaries.map((b) => {
        const bData = healthData[b.id] || initBeneficiaryData(b.id);
        const hasAny = bData.conditions.some(c => c);
        
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
                      {b.relationship || 'Titular'} {b.dni ? `• DNI: ${b.dni}` : ''}
                    </p>
                  </div>
                </div>
                <Badge variant={b.has_preexisting_conditions ? 'destructive' : 'default'}>
                  {b.has_preexisting_conditions ? 'Con preexistencias' : 'Sin preexistencias'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Physical metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 70"
                    value={bData.peso}
                    onChange={(e) => updateHealthData(b.id, { peso: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Altura (cm)</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 170"
                    value={bData.altura}
                    onChange={(e) => updateHealthData(b.id, { altura: e.target.value })}
                  />
                </div>
              </div>

              {/* Health categories */}
              <div className="space-y-2">
                <Label className="font-semibold">¿Padece o padeció alguna de las siguientes enfermedades?</Label>
                <div className="grid gap-2">
                  {HEALTH_CATEGORIES.map((cat, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${b.id}-cat-${index}`}
                          checked={bData.conditions[index] || false}
                          onCheckedChange={() => toggleCondition(b.id, index)}
                        />
                        <label
                          htmlFor={`${b.id}-cat-${index}`}
                          className="text-sm cursor-pointer leading-tight"
                        >
                          {cat}
                        </label>
                      </div>
                      {bData.conditions[index] && (
                        <Textarea
                          placeholder="Detalle la enfermedad, tratamiento, fecha, etc."
                          value={bData.details[index] || ''}
                          onChange={(e) => updateDetail(b.id, index, e.target.value)}
                          className="ml-6 text-sm"
                          rows={2}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
