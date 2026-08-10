/**
 * API client tests.
 *
 * The dedupe test is the one that matters. Everything else here would fail
 * loudly in development; a duplicated refresh fails intermittently, in
 * production, under load — and looks like a random sign-out.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, refreshAccessToken, __resetRefreshState } from "../client";
import { ApiError } from "../errors";
import { clearTokens, getAccessToken, setTokens } from "../tokens";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  __resetRefreshState();
  clearTokens();
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refresh dedupe", () => {
  it("makes exactly one refresh call for concurrent 401s", async () => {
    setTokens({ access: "expired", refresh: "valid-refresh" });

    let refreshCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/auth/refresh/")) {
        refreshCalls += 1;
        // A real refresh takes time. Without a delay the first call would
        // resolve before the others even start, and the test would pass
        // whether or not dedupe works.
        await new Promise((r) => setTimeout(r, 20));
        return json({ access: "fresh-access", refresh: "rotated-refresh" });
      }

      // Every data request 401s until the token is refreshed.
      const headers = init?.headers;
      const header = headers instanceof Headers ? headers.get("Authorization") : null;
      if (header === "Bearer fresh-access") return json({ ok: true });
      return json({ error: { code: "not_authenticated", detail: {} } }, 401);
    });

    vi.stubGlobal("fetch", fetchMock);

    // Five requests firing together, exactly like a dashboard mounting.
    await Promise.all([
      api.get("/bookings/"),
      api.get("/projects/"),
      api.get("/payments/"),
      api.get("/messages/"),
      api.get("/notifications/"),
    ]);

    expect(refreshCalls).toBe(1);
  });

  it("stores the rotated refresh token", async () => {
    setTokens({ access: "expired", refresh: "old-refresh" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ access: "fresh", refresh: "rotated" })),
    );

    await refreshAccessToken();

    // The backend rotates on every refresh. Failing to store the new one
    // means the next refresh presents a blacklisted token and the session
    // dies exactly one refresh-lifetime later.
    expect(localStorage.getItem("ona.refresh")).toBe("rotated");
    expect(getAccessToken()).toBe("fresh");
  });

  it("allows a new refresh after a previous one failed", async () => {
    setTokens({ access: "expired", refresh: "bad" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ detail: "invalid" }, 401)),
    );

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(ApiError);

    // If the rejected promise stayed memoised, every later request would
    // await a promise that can never resolve.
    setTokens({ access: "expired", refresh: "good" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ access: "recovered", refresh: "r" })),
    );

    await expect(refreshAccessToken()).resolves.toBe("recovered");
  });
});

describe("session handling", () => {
  it("clears tokens when the server rejects the refresh token", async () => {
    setTokens({ access: "expired", refresh: "revoked" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ detail: "blacklisted" }, 401)),
    );

    await expect(refreshAccessToken()).rejects.toMatchObject({ code: "session_expired" });
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("ona.refresh")).toBeNull();
  });

  it("does NOT clear tokens when the network fails", async () => {
    setTokens({ access: "expired", refresh: "still-valid" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(refreshAccessToken()).rejects.toMatchObject({ code: "network_error" });

    // Signing someone out because their connection dropped is a bug, not
    // a security measure. The token is still good.
    expect(localStorage.getItem("ona.refresh")).toBe("still-valid");
  });

  it("does not try to refresh a login failure", async () => {
    let refreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/auth/refresh/")) refreshCalls += 1;
        return json({ error: { code: "validation_error", detail: "Email or password is incorrect." } }, 400);
      }),
    );

    await expect(
      api.post("/auth/login/", { email: "a@b.com", password: "wrong" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(refreshCalls).toBe(0);
  });
});

describe("errors", () => {
  it("unwraps the backend envelope into field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(
          {
            error: {
              code: "validation_error",
              detail: { email: ["An account with this email already exists."] },
            },
          },
          400,
        ),
      ),
    );

    try {
      await api.post("/auth/register/", {});
      expect.unreachable("should have thrown");
    } catch (e) {
      const err = e as ApiError;
      expect(err.fieldErrors.email).toEqual(["An account with this email already exists."]);
      expect(err.status).toBe(400);
      expect(err.code).toBe("validation_error");
    }
  });

  it("surfaces a form-level message separately from field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({ error: { code: "throttled", detail: { detail: "Try again in 60 seconds." } } }, 429),
      ),
    );

    try {
      await api.post("/auth/login/", {});
      expect.unreachable("should have thrown");
    } catch (e) {
      const err = e as ApiError;
      expect(err.formError).toBe("Try again in 60 seconds.");
      expect(err.fieldErrors).toEqual({});
    }
  });

  it("treats non_field_errors as a form error, not a field error", async () => {
    // This is the exact envelope the backend returns for a wrong password,
    // captured from a live request. non_field_errors is DRF's name for a
    // serializer-level failure — it is not a field, and attaching it to one
    // means the form renders the message against an input that does not
    // exist, so the user sees nothing at all.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(
          {
            error: {
              code: "invalid",
              detail: { non_field_errors: ["Email or password is incorrect."] },
            },
          },
          400,
        ),
      ),
    );

    try {
      await api.post("/auth/login/", {});
      expect.unreachable("should have thrown");
    } catch (e) {
      const err = e as ApiError;
      expect(err.formError).toBe("Email or password is incorrect.");
      expect(err.fieldErrors).toEqual({});
    }
  });

  it("does not retry a 429", async () => {
    // The server is asking for less traffic. Retrying is the opposite.
    const fetchMock = vi.fn(async () =>
      json({ error: { code: "throttled", detail: {} } }, 429),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get("/anything/", { retries: 2 })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles a body-less 205 from logout", async () => {
    setTokens({ access: "a", refresh: "r" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 205 })));

    await expect(api.post("/auth/logout/", { refresh: "r" })).resolves.toBeUndefined();
  });
});
