import { beforeEach, describe, expect, it } from "vitest";

import {
  getCsrfHeaderName,
  getCsrfToken,
  invalidateCsrfToken,
  setCsrfToken,
} from "@/lib/csrf";

/**
 * CSRF token state.
 *
 * The backend now rejects state-changing requests that arrive without a token,
 * so getting this wrong logs everyone out of every form on the site. The rules
 * are small enough to pin exactly.
 */
describe("csrf token store", () => {
  beforeEach(() => {
    invalidateCsrfToken();
    // Restore the default header name between tests, since it is module state.
    setCsrfToken(null, "X-XSRF-TOKEN");
  });

  it("starts with no token so the first mutation fetches one", () => {
    expect(getCsrfToken()).toBeNull();
  });

  it("defaults to the header name Spring Security uses", () => {
    expect(getCsrfHeaderName()).toBe("X-XSRF-TOKEN");
  });

  it("stores the token the backend issued", () => {
    setCsrfToken("token-abc");

    expect(getCsrfToken()).toBe("token-abc");
  });

  it("adopts a header name supplied by the backend", () => {
    setCsrfToken("token-abc", "X-Custom-Csrf");

    expect(getCsrfHeaderName()).toBe("X-Custom-Csrf");
  });

  it("keeps the previous header name when none is supplied", () => {
    setCsrfToken("first", "X-Custom-Csrf");
    setCsrfToken("second");

    expect(getCsrfHeaderName()).toBe("X-Custom-Csrf");
    expect(getCsrfToken()).toBe("second");
  });

  it("invalidate clears the token but leaves the header name alone", () => {
    setCsrfToken("token-abc", "X-Custom-Csrf");

    invalidateCsrfToken();

    expect(getCsrfToken()).toBeNull();
    expect(getCsrfHeaderName()).toBe("X-Custom-Csrf");
  });
});
