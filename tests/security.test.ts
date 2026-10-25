import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { testDatabase } from "./helpers";
import { checkToken, digest, rateLimit, requireSameOrigin } from "@/server/security";
import { apiToken } from "@/db/schema";
import { createAuth } from "@/server/auth-config";
import { endpoint, readJson } from "@/server/errors";
let test: Awaited<ReturnType<typeof testDatabase>>;
beforeAll(async () => { test = await testDatabase(); process.env.BETTER_AUTH_URL = "http://localhost:3000"; process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("hex"); });
afterAll(async () => { await test.client.close(); });
beforeEach(async () => { await test.db.execute(sql`TRUNCATE api_token, rate_buckets, "user", account, session CASCADE`); });
describe("token and request security", () => {
  it("accepts only the stored token hash and rejects missing, wrong, and revoked tokens", async () => {
    const token = randomBytes(32).toString("base64url");
    await test.db.insert(apiToken).values({ id: 1, hash: digest(token) });
    const request = (value?: string) => new Request("http://localhost:3000/api/transactions", { headers: value ? { Authorization: `Bearer ${value}` } : {} });
    await expect(checkToken(test.db, request(token))).resolves.toBeUndefined();
    await expect(checkToken(test.db, request())).rejects.toMatchObject({ status: 401 });
    await expect(checkToken(test.db, request(randomBytes(32).toString("base64url")))).rejects.toMatchObject({ status: 401 });
    await test.db.delete(apiToken); await expect(checkToken(test.db, request(token))).rejects.toMatchObject({ status: 401 });
  });
  it("requires an exact trusted origin for cookie mutations", () => {
    expect(() => requireSameOrigin(new Request("http://localhost:3000", { headers: { origin: "http://localhost:3000" } }))).not.toThrow();
    expect(() => requireSameOrigin(new Request("http://localhost:3000", { headers: { origin: "https://evil.example" } }))).toThrow();
    expect(() => requireSameOrigin(new Request("http://localhost:3000"))).toThrow();
  });
  it("enforces database-backed rate limits with Retry-After", async () => {
    await rateLimit(test.db, "rate-test", 2); await rateLimit(test.db, "rate-test", 2);
    await expect(rateLimit(test.db, "rate-test", 2)).rejects.toMatchObject({ status: 429 });
    await test.db.execute(sql`UPDATE rate_buckets SET reset_at = now() - interval '1 second'`);
    await expect(rateLimit(test.db, "rate-test", 2)).resolves.toBeUndefined();
  });
  it("rejects oversized and malformed JSON without leaking errors", async () => {
    const request = (body: string) => new Request("http://localhost:3000", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    await expect(readJson(request("{"))).rejects.toMatchObject({ status: 400 });
    await expect(readJson(request("a".repeat(5000)))).rejects.toMatchObject({ status: 413 });
    const response = await endpoint(async () => { throw new Error("SECRET_DATABASE_URL"); });
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("SECRET_DATABASE_URL");
  });
});
describe("established owner authentication", () => {
  it("bootstraps one owner, hashes credentials, and sets HttpOnly sessions", async () => {
    const bootstrap = createAuth(test.db, true);
    await bootstrap.api.signUpEmail({ body: { name: "Owner", email: "owner@example.test", password: "test-only-long-password-123" } });
    const app = createAuth(test.db);
    await expect(app.api.signUpEmail({ body: { name: "Other", email: "other@example.test", password: "test-only-long-password-123" } })).rejects.toBeTruthy();
    const response = await app.handler(new Request("http://localhost:3000/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: JSON.stringify({ email: "owner@example.test", password: "test-only-long-password-123" }) }));
    expect(response.status).toBe(200); expect(response.headers.get("set-cookie")).toMatch(/httponly/i); expect(response.headers.get("set-cookie")).toMatch(/samesite=lax/i);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    const session = await app.api.getSession({ headers: new Headers({ cookie }) }); expect(session?.user.email).toBe("owner@example.test");
    const rows = await test.client.query<{ password: string }>("SELECT password FROM account"); expect(rows.rows[0].password).not.toContain("test-only-long-password");
    await expect(bootstrap.api.signUpEmail({ body: { name: "Second", email: "second@example.test", password: "test-only-long-password-123" } })).rejects.toBeTruthy();
  });
});
