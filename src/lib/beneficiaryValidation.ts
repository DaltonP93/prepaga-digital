/**
 * Reglas de validación de un adherente, compartidas por los DOS formularios que
 * lo cargan:
 *
 *   - src/components/beneficiaries/BeneficiaryForm.tsx  (detalle de la venta)
 *   - src/components/sale-form/SaleAdherentsTab.tsx     (alta de la venta)
 *
 * Hasta ahora cada uno validaba distinto: el primero exigía parentesco pero no
 * teléfono, el segundo exigía teléfono pero no parentesco. El mismo adherente
 * pasaba o no según la pantalla por la que se lo cargara.
 */

export type BeneficiaryValidationContext = {
  /** `true` si el titular del contrato es una empresa. */
  isCompany?: boolean;
};

export type BeneficiaryValidationInput = {
  first_name?: string | null;
  last_name?: string | null;
  relationship?: string | null;
  phone?: string | null;
  signature_required?: boolean | null;
};

/**
 * Cómo se llama el vínculo del adherente con el titular.
 *
 * En un contrato de empresa los adherentes son funcionarios, no familiares:
 * "Parentesco" no significa nada ahí. Se rotula "Cargo" y deja de ser
 * obligatorio, porque el cargo no siempre se conoce al cargar la nómina.
 */
export const getRelationshipLabel = (ctx?: BeneficiaryValidationContext): string =>
  ctx?.isCompany ? 'Cargo' : 'Parentesco';

export const isRelationshipRequired = (ctx?: BeneficiaryValidationContext): boolean =>
  !ctx?.isCompany;

/**
 * ¿Hace falta el teléfono?
 *
 * Sólo si el adherente tiene que firmar: el OTP de la firma se manda por
 * WhatsApp, así que sin teléfono el flujo se traba. Un adherente que no firma
 * (un hijo menor, por ejemplo) puede no tener teléfono propio, y exigírselo
 * bloqueaba una carga legítima.
 *
 * `signature_required` sin definir se toma como `true`, que es el default de la
 * columna en la base.
 */
export const isPhoneRequired = (input: BeneficiaryValidationInput): boolean =>
  input.signature_required !== false;

/**
 * Devuelve el primer error encontrado, o `null` si el adherente es válido.
 * El texto es el que se le muestra al usuario.
 */
export const validateBeneficiary = (
  input: BeneficiaryValidationInput,
  ctx?: BeneficiaryValidationContext,
): string | null => {
  if (!input.first_name?.trim() || input.first_name.trim().length < 2) {
    return 'El nombre debe tener al menos 2 caracteres';
  }
  if (!input.last_name?.trim() || input.last_name.trim().length < 2) {
    return 'El apellido debe tener al menos 2 caracteres';
  }
  if (isRelationshipRequired(ctx) && !input.relationship?.trim()) {
    return 'El parentesco es obligatorio';
  }
  if (isPhoneRequired(input) && !input.phone?.trim()) {
    return 'El teléfono es obligatorio para quien tiene que firmar';
  }
  return null;
};
