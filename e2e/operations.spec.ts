import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test("operator can open patrol, events, ask, and drive", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/operations/patrol");
  await expect(page.getByRole("heading", { name: "Patrol" })).toBeVisible();

  await page.goto("/app/operations/events");
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
  await expect(page.getByLabel("Search events")).toBeVisible();

  await page.goto("/app/operations/ask");
  await expect(page.getByRole("heading", { name: "Ask history" })).toBeVisible();

  await page.goto("/app/operations/drive");
  await expect(page.getByRole("heading", { name: "Drive & navigate" })).toBeVisible();
});

test("research workspace lists experiments", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/research/experiments");
  await expect(page.getByRole("heading", { name: "Experiments" })).toBeVisible();
  await expect(page.getByLabel("Search experiments")).toBeVisible();
});

test("events search can be cleared", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/operations/events");
  await page.getByLabel("Search events").fill("no-such-event-zzz");
  await expect(page.getByText("No events match")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Search events")).toHaveValue("");
});
