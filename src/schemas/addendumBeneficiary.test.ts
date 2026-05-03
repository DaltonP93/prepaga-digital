import { describe, it, expect } from 'vitest';
import { addendumBeneficiarySchema } from './addendumBeneficiary';

describe('addendumBeneficiarySchema', () => {
  it('accepts valid beneficiary', () => {
    const result = addendumBeneficiarySchema.safeParse({
      first_name: 'Juan',
      last_name: 'Pérez',
      amount: 100000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty first_name', () => {
    const result = addendumBeneficiarySchema.safeParse({
      first_name: '',
      last_name: 'Pérez',
    });
    expect(result.success).toBe(false);
  });
});
