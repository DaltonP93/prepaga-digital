import { test, expect } from '@playwright/test';

test.describe('Addendum Flow', () => {
  test('vendor can create an addendum and beneficiary signs', async ({ page }) => {
    // TODO: Implement full E2E flow once addendum UI is ready
    // 1. Login as vendor
    // 2. Navigate to an existing sale
    // 3. Open addendum modal
    // 4. Add beneficiaries
    // 5. Generate signature links
    // 6. Sign as beneficiary
    // 7. Assert status change

    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
  });
});
