import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

function getBackendOrigin() {
  const configured = process.env.BACKEND_API_URL;
  if (!configured) {
    throw new Error("BACKEND_API_URL must be configured for the Next.js server.");
  }

  const url = new URL(configured);
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (process.env.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      !isLoopback)
  ) {
    throw new Error("BACKEND_API_URL must be an origin; production requires HTTPS.");
  }
  return url.origin;
}

export async function requestBackendData<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(new URL(path, `${getBackendOrigin()}/`), {
      ...init,
      cache: "no-store",
      signal: init?.signal ?? AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Backend API request failed.", {
      path,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    throw new BackendApiError("The backend service is unavailable.", 502, "BACKEND_UNAVAILABLE");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    console.error("Backend API returned an invalid JSON response.", {
      path,
      status: response.status,
    });
    throw new BackendApiError("The backend returned an invalid response.", 502, "INVALID_RESPONSE");
  }

  if (!response.ok) {
    const parsedError = errorEnvelopeSchema.safeParse(body);
    if (parsedError.success) {
      throw new BackendApiError(
        parsedError.data.error.message,
        response.status,
        parsedError.data.error.code,
      );
    }
    throw new BackendApiError("The backend returned an invalid error response.", response.status, "INVALID_RESPONSE");
  }

  const envelope = z.object({ data: schema }).passthrough().parse(body);
  return envelope.data;
}

export async function proxyBackendRequest(request: Request, path: string): Promise<Response> {
  const headers = new Headers();
  for (const name of ["content-type", "cookie", "origin", "x-request-id", "x-forwarded-for"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const method = request.method.toUpperCase();
  let response: Response;
  try {
    response = await fetch(new URL(path, `${getBackendOrigin()}/`), {
      method,
      headers,
      ...(method === "GET" || method === "HEAD" ? {} : { body: await request.arrayBuffer() }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    console.error("Backend API proxy failed.", {
      requestId,
      path,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({
      error: {
        code: "BACKEND_UNAVAILABLE",
        message: "The backend service is unavailable.",
        requestId,
      },
    }, {
      status: 502,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    });
  }
  const responseHeaders = new Headers();
  for (const name of ["cache-control", "content-type", "retry-after", "x-request-id"]) {
    const value = response.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
