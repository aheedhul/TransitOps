import { test, expect } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1')).toHaveText('TransitOps');
  await expect(page.locator('button[type="submit"]')).toHaveText('Sign in');
});
