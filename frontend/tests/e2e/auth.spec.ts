import { expect, test, type Page } from "@playwright/test";
import { STRONG_PASSWORD, defaultState, mockApi } from "./fixtures";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

const usernameInput = (page: Page) => page.locator('input[autocomplete="username"]');
const passwordInput = (page: Page) => page.locator('input[autocomplete="current-password"], input[autocomplete="new-password"]').first();
const repeatPasswordInput = (page: Page) => page.locator('input[autocomplete="new-password"]').nth(1);
const nameInput = (page: Page) => page.locator('input[autocomplete="name"]');
const emailInput = (page: Page) => page.locator('input[autocomplete="email"]');

test("shows the login form on first visit", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await expect(usernameInput(page)).toBeVisible();
  await expect(passwordInput(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("toggles between login and register views", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByRole("button", { name: /Need an account/ }).click();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(nameInput(page)).toBeVisible();
  await expect(emailInput(page)).toBeVisible();

  await page.getByRole("button", { name: /Have an account/ }).click();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("wrong credentials surface an error and keep us on the login screen", async ({ page }) => {
  const state = defaultState();
  state.loginShouldFail = true;
  await mockApi(page, state);
  await page.goto("/");

  await usernameInput(page).fill("alice");
  await passwordInput(page).fill("Some-Wrong-Pass-123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.locator(".auth-err")).toHaveText(/Invalid username or password/);
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("successful login lands on the main app", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await usernameInput(page).fill("tester");
  await passwordInput(page).fill(STRONG_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.locator(".logo-name")).toHaveText("GAMGEE");
  await expect(page.locator(".tabs")).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem("iron_log_token"));
  expect(token).toBe("fake-jwt-token");
});

test("register form validates and submits a full payload", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByRole("button", { name: /Need an account/ }).click();

  const submit = page.getByRole("button", { name: "Create account" });

  // Button stays disabled until the full payload is valid.
  await expect(submit).toBeDisabled();

  await usernameInput(page).fill("newbie");
  await nameInput(page).fill("New Bie");
  await emailInput(page).fill("newbie@example.com");
  await page.locator('select').selectOption("prefer_not_to_say");
  await passwordInput(page).fill(STRONG_PASSWORD);
  await repeatPasswordInput(page).fill(STRONG_PASSWORD);

  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.locator(".logo-name")).toHaveText("GAMGEE");
});

test("an existing stored token skips the login screen", async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("iron_log_token", "fake-jwt-token");
  });
  await page.goto("/");

  await expect(page.locator(".logo-name")).toHaveText("GAMGEE");
  await expect(usernameInput(page)).toHaveCount(0);
});
