import { describe, expect, it } from "vitest";

import { resolveApiBase } from "@/lib/apiBase";

const HOST = "cameroon-carreer-connect-back-production.up.railway.app";

describe("resolveApiBase", () => {
  it("stays empty in proxy mode, whatever shape the blank takes", () => {
    expect(resolveApiBase(undefined)).toBe("");
    expect(resolveApiBase("")).toBe("");
    expect(resolveApiBase("   ")).toBe("");
  });

  it("leaves an absolute origin alone", () => {
    expect(resolveApiBase(`https://${HOST}`)).toBe(`https://${HOST}`);
    expect(resolveApiBase("http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("restores the scheme a bare hostname is missing", () => {
    // Without this the value is a relative path: axios would POST to
    // https://<the-spa>/<host>/api/hjp/auth/login and the static host
    // answers 405, which is how this reached production.
    expect(resolveApiBase(HOST)).toBe(`https://${HOST}`);
  });

  it("drops a trailing slash, which would double up against /api", () => {
    expect(resolveApiBase(`https://${HOST}/`)).toBe(`https://${HOST}`);
    expect(resolveApiBase(`${HOST}//`)).toBe(`https://${HOST}`);
  });
});
