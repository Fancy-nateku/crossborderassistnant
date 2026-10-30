import { NextResponse } from "next/server";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  requestId?: string,
): NextResponse<ApiErrorBody> {
  const reqId = requestId ?? crypto.randomUUID();
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        requestId: reqId,
      },
    },
    {
      status,
      headers: {
        "x-request-id": reqId,
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  extraHeaders?: Record<string, string>,
): NextResponse<T> {
  const requestId = crypto.randomUUID();
  return NextResponse.json(data, {
    status,
    headers: {
      "x-request-id": requestId,
      ...extraHeaders,
    },
  });
}
