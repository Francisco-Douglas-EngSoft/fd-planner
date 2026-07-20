import { test, expect } from "@playwright/test";

test("landing page carrega e mostra CTA principal", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FD-Planner|Planner|Estudos/i);
  // O botão principal leva para /auth
  const cta = page.getByRole("link", { name: /começar|entrar|acessar/i }).first();
  await expect(cta).toBeVisible();
});