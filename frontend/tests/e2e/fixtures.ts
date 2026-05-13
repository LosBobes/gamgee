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

/** Strong password that satisfies the live frontend policy checker. */
export const STRONG_PASSWORD = "Str0ng-Test-Pass!";

/**
 * Stub all `/api/*` requests with reasonable defaults so the SPA can run
 * end-to-end without a real backend. Override individual responses by
 * mutating the returned `state` object before the test triggers the call.
 */
export async function mockApi(page: Page, state: MockState = defaultState()): Promise<MockState> {
  // Skip the 2-second splash animation: the screen respects
  // `prefers-reduced-motion` and drops to ~350ms.
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Pin the UI tone so button text and copy are stable across tests, and
  // pre-dismiss the first-launch welcome modal so its overlay doesn't
  // intercept clicks on the underlying tabs/buttons.
  await page.addInitScript(() => {
    window.localStorage.setItem("gamgee_tone", "pro");
    window.localStorage.setItem("gamgee_welcome_seen", "1");
  });

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
    json(route, { id: 1, username: state.username, name: "Tester", email: "tester@example.com", is_admin: false }),
  );

  await page.route("**/api/workouts", route => json(route, state.workouts));
  await page.route("**/api/prs", route => json(route, state.prs));
  await page.route("**/api/health**", route => json(route, []));
  await page.route("**/api/buddies**", route => json(route, []));
  await page.route("**/api/notifications**", route => {
    if (route.request().url().includes("unread-count")) return json(route, { count: 0 });
    return json(route, []);
  });
  await page.route("**/api/live-sessions**", route => json(route, []));

  return state;
}
