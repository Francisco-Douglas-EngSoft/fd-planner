import { test, expect } from "@playwright/test";

test("página de autenticação renderiza email + senha", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByLabel(/e-?mail/i).first()).toBeVisible();
  await expect(page.getByLabel(/senha/i).first()).toBeVisible();
});