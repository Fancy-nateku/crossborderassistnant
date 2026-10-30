import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

describe("Express API transport", () => {
  let server: Server | undefined;
  let baseUrl: string;
  const previousEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    AUTH_SECRET: process.env.AUTH_SECRET,
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/crossborder_test";
    process.env.ALLOWED_ORIGINS = "http://localhost:3000";
    process.env.AUTH_SECRET = "test-only-auth-secret";
    const { app } = await import("./app.js");
    const testServer = app.listen(0);
    server = testServer;
    await new Promise<void>((resolve, reject) => {
      testServer.once("listening", resolve);
      testServer.once("error", reject);
    });
    const rawAddress = testServer.address();
    if (!rawAddress || typeof rawAddress === "string") {
      throw new Error("Express test server did not bind to a TCP port.");
    }
    const address: AddressInfo = rawAddress;
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 30_000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => error ? reject(error) : resolve());
      });
    }
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("serves health with security headers", async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("allows preflight only from an explicitly configured origin", async () => {
    const allowed = await fetch(`${baseUrl}/api/v1/borders`, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "GET",
      },
    });
    const rejected = await fetch(`${baseUrl}/api/v1/borders`, {
      headers: { origin: "https://not-allowed.example" },
    });

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(rejected.status).toBe(403);
    await expect(rejected.json()).resolves.toMatchObject({
      error: { code: "ORIGIN_NOT_ALLOWED" },
    });
  });

  it("rejects malformed preview bodies and unauthenticated saved-plan access", async () => {
    const invalidPreview = await fetch(`${baseUrl}/api/v1/plan-previews`, {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: "{",
    });
    const privatePlans = await fetch(`${baseUrl}/api/v1/saved-plans`);

    expect(invalidPreview.status).toBe(400);
    await expect(invalidPreview.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
    expect(privatePlans.status).toBe(401);
    await expect(privatePlans.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("keeps admin routes private and origin-protected", async () => {
    const privateAuditLog = await fetch(`${baseUrl}/api/v1/admin/audit-logs`);
    const forbiddenWrite = await fetch(`${baseUrl}/api/v1/admin/sources`, {
      method: "POST",
      headers: {
        origin: "https://not-allowed.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: "x", name: "x" }),
    });

    expect(privateAuditLog.status).toBe(401);
    await expect(privateAuditLog.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(forbiddenWrite.status).toBe(403);
    await expect(forbiddenWrite.json()).resolves.toMatchObject({
      error: { code: "ORIGIN_NOT_ALLOWED" },
    });
  });
});
