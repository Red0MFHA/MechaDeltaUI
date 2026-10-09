import { expect, test } from "@playwright/test";

import { demo, signIn } from "./helpers";

test("unauthenticated visits are sent to sign-in", async ({ page }) => {
  await page.goto("/app/operations/overview");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("demo account opens the operations overview", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Simulated · mock")).toBeVisible();
});

test("wrong password stays on sign-in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(demo.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});
