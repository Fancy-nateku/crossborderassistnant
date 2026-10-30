import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { proxyBackendRequest, requestBackendData } from "./backend";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Express backend adapter", () => {
  it("parses the data envelope and disables Next fetch caching", async () => {
    vi.stubEnv("BACKEND_API_URL", "http://localhost:4000");
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ data: { status: "ok" } }), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestBackendData(
      "/api/v1/health",
      z.object({ status: z.string() }),
    );

    expect(result).toEqual({ status: "ok" });
    expect(fetchMock.mock.calls[0][0]).toBeInstanceOf(URL);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("allows HTTP only for loopback backend origins in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKEND_API_URL", "http://localhost:4000");
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ data: { status: "ok" } }), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestBackendData("/api/v1/health", z.object({ status: z.string() })),
    ).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("continues to reject non-loopback HTTP backend origins in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKEND_API_URL", "http://backend.example.test");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestBackendData("/api/v1/health", z.object({ status: z.string() })),
    ).rejects.toMatchObject({ status: 502, code: "BACKEND_UNAVAILABLE" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the browser cookie and origin through the same-origin proxy", async () => {
    vi.stubEnv("BACKEND_API_URL", "http://localhost:4000");
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("http://next.local/api/v1/admin/audit-logs", {
      method: "DELETE",
      headers: {
        cookie: "authjs.session-token=opaque",
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
    });

    const response = await proxyBackendRequest(request, "/api/v1/admin/audit-logs");

    expect(response.status).toBe(204);
    const init = fetchMock.mock.calls[0][1];
    expect(init).toBeDefined();
    if (!init) throw new Error("Backend proxy did not issue a fetch request.");
    const forwardedHeaders = new Headers(init.headers);
    expect(forwardedHeaders.get("cookie")).toBe("authjs.session-token=opaque");
    expect(forwardedHeaders.get("origin")).toBe("http://localhost:3000");
    expect(init.method).toBe("DELETE");
  });
});
