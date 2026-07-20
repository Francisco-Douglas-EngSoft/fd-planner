import { test, expect } from "@playwright/test";

test("rotas protegidas redirecionam para /auth quando sem sessão", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/auth/i, { timeout: 10_000 });
  await expect(page).toHaveURL(/\/auth/i);
});