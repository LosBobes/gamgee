import type { Page, Route } from "@playwright/test";

/** Shared response state for in-test API mocking. */
export interface MockState {
  token: string;
  username: string;
  workouts: unknown[];
  prs: unknown[];
  loginShouldFail?: boolean;
  registerShouldFailWith?: { status: number; detail: string };
}

export function defaultState(): MockState {
  return {
    token: "fake-jwt-token",
    username: "tester",
    workouts: [],
    prs: [],
  };
}

/**
 * Stub all `/api/*` requests with reasonable defaults so the SPA can run
 * end-to-end without a real backend. Override individual responses by
 * mutating the returned `state` object before the test triggers the call.
 */
export async function mockApi(page: Page, state: MockState = defaultState()): Promise<MockState> {
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/auth/register", async route => {
    if (state.registerShouldFailWith) {
      await json(route, { detail: state.registerShouldFailWith.detail }, state.registerShouldFailWith.status);
      return;
    }
    await json(route, { id: 1, username: state.username }, 201);
  });

  await page.route("**/api/auth/login", async route => {
    if (state.loginShouldFail) {
      await json(route, { detail: "Invalid username or password" }, 401);
      return;
    }
    await json(route, { access_token: state.token, token_type: "bearer" });
  });

  await page.route("**/api/auth/me", route =>
    json(route, { id: 1, username: state.username }),
  );

  await page.route("**/api/workouts", route => json(route, state.workouts));
  await page.route("**/api/prs", route => json(route, state.prs));
  await page.route("**/api/health**", route => json(route, []));

  return state;
}
