
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const beneficiarySchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  document_type: z.string().optional(),
  document_number: z.string().optional(),
  dni: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  relationship: z.string().min(1, 'La relación es requerida'),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  barrio: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  amount: z.number().min(0).optional(),
  is_primary: z.boolean().optional(),
  signature_required: z.boolean().optional(),
  has_preexisting_conditions: z.boolean().optional(),
  preexisting_conditions_detail: z.string().optional(),
});

export type BeneficiaryFormData = z.infer<typeof beneficiarySchema>;

interface BeneficiaryFormProps {
  defaultValues?: Partial<BeneficiaryFormData>;
  onSubmit: (data: BeneficiaryFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
}

export const BeneficiaryForm: React.FC<BeneficiaryFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditing = false,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BeneficiaryFormData>({
    resolver: zodResolver(beneficiarySchema),
    defaultValues: {
      is_primary: false,
      signature_required: true,
      has_preexisting_conditions: false,
      ...defaultValues,
    },
  });

  const hasPreexistingConditions = watch('has_preexisting_conditions');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Datos Personales</TabsTrigger>
          <TabsTrigger value="contact">Contacto y Dirección</TabsTrigger>
          <TabsTrigger value="health">Salud y Cobertura</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                {...register('first_name')}
                placeholder="Nombre del beneficiario"
              />
              {errors.first_name && (
                <p className="text-destructive text-sm mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                {...register('last_name')}
                placeholder="Apellido del beneficiario"
              />
              {errors.last_name && (
                <p className="text-destructive text-sm mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="document_type">Tipo de Documento</Label>
              <Select onValueChange={(value) => setValue('document_type', value)} defaultValue={defaultValues?.document_type}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ci">Cédula de Identidad</SelectItem>
                  <SelectItem value="dni">DNI</SelectItem>
                  <SelectItem value="pasaporte">Pasaporte</SelectItem>
                  <SelectItem value="ruc">RUC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="document_number">Número de Documento</Label>
              <Input
                id="document_number"
                {...register('document_number')}
                placeholder="Número de documento"
              />
            </div>
            <div>
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                {...register('birth_date')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="gender">Género</Label>
              <Select onValueChange={(value) => setValue('gender', value)} defaultValue={defaultValues?.gender}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="marital_status">Estado Civil</Label>
              <Select onValueChange={(value) => setValue('marital_status', value)} defaultValue={defaultValues?.marital_status}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soltero">Soltero/a</SelectItem>
                  <SelectItem value="casado">Casado/a</SelectItem>
                  <SelectItem value="divorciado">Divorciado/a</SelectItem>
                  <SelectItem value="viudo">Viudo/a</SelectItem>
                  <SelectItem value="union_libre">Unión Libre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="occupation">Ocupación</Label>
              <Input
                id="occupation"
                {...register('occupation')}
                placeholder="Ocupación"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="relationship">Relación con Titular *</Label>
              <Select onValueChange={(value) => setValue('relationship', value)} defaultValue={defaultValues?.relationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar relación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="titular">Titular</SelectItem>
                  <SelectItem value="conyuge">Cónyuge</SelectItem>
                  <SelectItem value="hijo">Hijo/a</SelectItem>
                  <SelectItem value="padre">Padre</SelectItem>
                  <SelectItem value="madre">Madre</SelectItem>
                  <SelectItem value="hermano">Hermano/a</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errors.relationship && (
                <p className="text-destructive text-sm mt-1">{errors.relationship.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-4 pt-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_primary"
                  checked={watch('is_primary')}
                  onCheckedChange={(checked) => setValue('is_primary', checked)}
                />
                <Label htmlFor="is_primary">Es titular principal</Label>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Email del beneficiario"
              />
              {errors.email && (
                <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Teléfono del beneficiario"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Domicilio</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Ej: Boquerón 123"
              />
            </div>
            <div>
              <Label htmlFor="barrio">Barrio</Label>
              <Input
                id="barrio"
                {...register('barrio')}
                placeholder="Ej: Villa Morra"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Ciudad"
              />
            </div>
            <div>
              <Label htmlFor="province">Departamento</Label>
              <Input
                id="province"
                {...register('province')}
                placeholder="Departamento"
              />
            </div>
            <div>
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                {...register('postal_code')}
                placeholder="Código postal"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Monto de Cobertura</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="signature_required"
                checked={watch('signature_required')}
                onCheckedChange={(checked) => setValue('signature_required', checked)}
              />
              <Label htmlFor="signature_required">Requiere firma</Label>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center space-x-2">
              <Switch
                id="has_preexisting_conditions"
                checked={hasPreexistingConditions}
                onCheckedChange={(checked) => setValue('has_preexisting_conditions', checked)}
              />
              <Label htmlFor="has_preexisting_conditions">
                ¿Tiene condiciones preexistentes?
              </Label>
            </div>

            {hasPreexistingConditions && (
              <div>
                <Label htmlFor="preexisting_conditions_detail">
                  Detalle de condiciones preexistentes
                </Label>
                <Textarea
                  id="preexisting_conditions_detail"
                  {...register('preexisting_conditions_detail')}
                  placeholder="Describa las condiciones preexistentes..."
                  rows={4}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Actualizar' : 'Crear'} Beneficiario
        </Button>
      </div>
    </form>
  );
};
