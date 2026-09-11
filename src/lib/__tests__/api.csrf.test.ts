import { beforeEach, describe, expect, it } from "vitest";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

import { api } from "@/lib/api";
import { invalidateCsrfToken } from "@/lib/csrf";

/**
 * CSRF behaviour of the axios client.
 *
 * The backend rejects state-changing requests without a token, so these assert
 * the contract end to end through the real interceptors: fetch a token before
 * the first mutation, attach it, leave reads alone, and recover from a rotated
 * token without surfacing an error to the user.
 *
 * Requests are intercepted by swapping the adapter, so nothing touches the
 * network and the interceptor chain runs exactly as it does in the browser.
 */

interface Recorded {
  url: string;
  method: string;
  headers: Record<string, unknown>;
}

const CSRF_URL = "/api/hjp/auth/csrf";

let recorded: Recorded[] = [];
/** Responses keyed by url, consumed in order; falls back to 200 OK. */
let scripted: Array<(cfg: AxiosRequestConfig) => AxiosResponse | Promise<AxiosResponse>> = [];

function ok(config: AxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: "OK",
    headers: {},
    config: config as AxiosResponse["config"],
  };
}

function csrfIssue(config: AxiosRequestConfig, token = "token-1"): AxiosResponse {
  return ok(config, { success: true, message: "ok", data: { token, headerName: "X-XSRF-TOKEN" } });
}

beforeEach(() => {
  recorded = [];
  scripted = [];
  invalidateCsrfToken();

  api.defaults.adapter = async (config: AxiosRequestConfig) => {
    recorded.push({
      url: config.url ?? "",
      method: (config.method ?? "get").toLowerCase(),
      headers: { ...(config.headers as Record<string, unknown>) },
    });

    if (config.url === CSRF_URL) return csrfIssue(config);

    const next = scripted.shift();
    if (next) return next(config);
    return ok(config, { success: true, message: "ok", data: null });
  };
});

/** Everything except the token-fetch calls. */
const mutations = (all: Recorded[]): Recorded[] => all.filter((r) => r.url !== CSRF_URL);

describe("csrf interceptor", () => {
  it("does not fetch or attach a token for a read", async () => {
    await api.get("/api/hjp/jobs/all");

    expect(recorded.map(r => r.url)).toEqual(["/api/hjp/jobs/all"]);
    expect(recorded[0].headers["X-XSRF-TOKEN"]).toBeUndefined();
  });

  it("fetches a token before the first mutation and attaches it", async () => {
    await api.post("/api/hjp/jobs/apply", {});

    expect(recorded[0].url).toBe(CSRF_URL);
    expect(recorded[1].url).toBe("/api/hjp/jobs/apply");
    expect(recorded[1].headers["X-XSRF-TOKEN"]).toBe("token-1");
  });

  it("reuses the cached token instead of refetching on every mutation", async () => {
    await api.post("/api/hjp/jobs/apply", {});
    await api.patch("/api/hjp/saved-searches/1", {});

    expect(recorded.filter(r => r.url === CSRF_URL)).toHaveLength(1);
    expect(mutations(recorded)).toHaveLength(2);
    expect(mutations(recorded)[1].headers["X-XSRF-TOKEN"]).toBe("token-1");
  });

  it("attaches the token to every mutating verb", async () => {
    await api.post("/a", {});
    await api.put("/b", {});
    await api.patch("/c", {});
    await api.delete("/d");

    for (const r of mutations(recorded)) {
      expect(r.headers["X-XSRF-TOKEN"], `${r.method} ${r.url}`).toBe("token-1");
    }
  });

  it("refetches and replays once when the backend rejects a rotated token", async () => {
    // First attempt is rejected as a CSRF failure; the replay succeeds.
    scripted = [
      (cfg) => {
        const res = ok(cfg, { message: "Invalid CSRF token", errorCode: "CSRF_ERROR" }, 403);
        return Promise.reject(Object.assign(new Error("403"), { response: res, config: cfg, isAxiosError: true }));
      },
      (cfg) => ok(cfg, { success: true, message: "ok", data: "replayed" }),
    ];

    const res = await api.post("/api/hjp/jobs/apply", {});

    expect(res.data.data).toBe("replayed");
    // Two token fetches: the initial one, plus the forced refresh after the 403.
    expect(recorded.filter(r => r.url === CSRF_URL)).toHaveLength(2);
    expect(mutations(recorded)).toHaveLength(2);
  });

  it("gives up rather than looping when the replay is rejected too", async () => {
    const reject = (cfg: AxiosRequestConfig) => {
      const res = ok(cfg, { message: "Invalid CSRF token", errorCode: "CSRF_ERROR" }, 403);
      return Promise.reject(
        Object.assign(new Error("403"), { response: res, config: cfg, isAxiosError: true }),
      );
    };
    scripted = [reject, reject, reject];

    await expect(api.post("/api/hjp/jobs/apply", {})).rejects.toThrow();

    // One retry only.
    expect(mutations(recorded)).toHaveLength(2);
  });
});
