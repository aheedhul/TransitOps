import { test, expect } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h2')).toContainText('Welcome back');
  await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
});
