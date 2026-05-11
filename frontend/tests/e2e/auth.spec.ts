import { expect, test } from "@playwright/test";
import { defaultState, mockApi } from "./fixtures";

test.beforeEach(async ({ context }) => {
  // Make sure no token from a previous test leaks into this one.
  await context.clearCookies();
});

test("shows the login form on first visit", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await expect(page.getByPlaceholder("Username")).toBeVisible();
  await expect(page.getByPlaceholder("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("toggles between login and register views", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByRole("button", { name: /Need an account/ }).click();
  await expect(page.getByRole("button", { name: "Register" })).toBeVisible();

  await page.getByRole("button", { name: /Have an account/ }).click();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("wrong credentials surface an error and keep us on the login screen", async ({ page }) => {
  const state = defaultState();
  state.loginShouldFail = true;
  await mockApi(page, state);
  await page.goto("/");

  await page.getByPlaceholder("Username").fill("alice");
  await page.getByPlaceholder("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.locator(".auth-err")).toHaveText(/Invalid username or password/);
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("successful login lands on the main app", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByPlaceholder("Username").fill("tester");
  await page.getByPlaceholder("Password").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();

  // App header renders with brand once we're authenticated.
  await expect(page.locator(".logo-name")).toHaveText("GAMGEE");
  await expect(page.locator(".tabs")).toBeVisible();

  // Token is persisted for the next visit.
  const token = await page.evaluate(() => localStorage.getItem("iron_log_token"));
  expect(token).toBe("fake-jwt-token");
});

test("register-then-login flow succeeds", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");

  await page.getByRole("button", { name: /Need an account/ }).click();
  await page.getByPlaceholder("Username").fill("newbie");
  await page.getByPlaceholder("Password").fill("hunter2222");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.locator(".logo-name")).toHaveText("GAMGEE");
});

test("an existing stored token skips the login screen", async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("iron_log_token", "fake-jwt-token");
  });
  await page.goto("/");

  await expect(page.locator(".logo-name")).toHaveText("GAMGEE");
  await expect(page.getByPlaceholder("Password")).toHaveCount(0);
});
