import { expect, type Page } from "@playwright/test";

export const demo = {
  email: "demo@mechadelta.lab",
  password: "mechadelta",
};

export async function signIn(page: Page) {
  await page.goto("/sign-in");
  const submit = page.getByRole("button", { name: "Sign in" });
  await expect(submit).toBeEnabled();
  await page.getByLabel("Email").fill(demo.email);
  await page.getByLabel("Password").fill(demo.password);
  await submit.click();
  await expect(page).toHaveURL(/\/app\/operations\/overview/);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}
