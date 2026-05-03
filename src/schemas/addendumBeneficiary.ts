import { z } from 'zod';

export const addendumBeneficiarySchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido'),
  last_name: z.string().min(1, 'Apellido requerido'),
  dni: z.string().nullable().optional(),
  document_type: z.string().nullable().optional(),
  document_number: z.string().nullable().optional(),
  relationship: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Email inválido').nullable().optional().or(z.literal('')),
  address: z.string().nullable().optional(),
  barrio: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  amount: z.number().min(0).nullable().optional(),
  signature_required: z.boolean().optional(),
  has_preexisting_conditions: z.boolean().optional(),
  preexisting_conditions_detail: z.string().nullable().optional(),
});

export type AddendumBeneficiaryInput = z.infer<typeof addendumBeneficiarySchema>;
