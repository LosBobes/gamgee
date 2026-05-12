import { expect, test } from "@playwright/test";
import { mockApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("iron_log_token", "fake-jwt-token");
  });
  await page.goto("/");
  // Wait past the splash before we start clicking.
  await expect(page.locator(".tabs")).toBeVisible();
});

test("can switch between top-level tabs", async ({ page }) => {
  const tabs = page.locator(".tabs .tab");
  await expect(tabs).toHaveCount(6);

  await tabs.filter({ hasText: "HISTORY" }).first().click();
  await expect(tabs.filter({ hasText: "HISTORY" }).first()).toHaveClass(/active/);

  await tabs.filter({ hasText: "PRs" }).first().click();
  await expect(tabs.filter({ hasText: "PRs" }).first()).toHaveClass(/active/);

  await tabs.filter({ hasText: "PROFILE" }).first().click();
  await expect(tabs.filter({ hasText: "PROFILE" }).first()).toHaveClass(/active/);
});

test("clicking logout returns to the auth screen", async ({ page }) => {
  await page.locator(".logout-btn", { hasText: "Logout" }).first().click();
  await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem("iron_log_token"));
  expect(token).toBeNull();
});
