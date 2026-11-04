import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

declare global {
  // Express request augmentation carries the correlation ID across middleware.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  const supplied = req.get("x-request-id");
  req.requestId = supplied && /^[A-Za-z0-9._-]{1,80}$/.test(supplied)
    ? supplied
    : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};

export function sendError(
  req: Express.Request,
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  res
    .status(status)
    .setHeader("Cache-Control", "no-store")
    .json({ error: { code, message, ...(details ? { details } : {}), requestId: req.requestId } });
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  void next;
  if (error instanceof ZodError) {
    const first = error.issues[0];
    sendError(req, res, 400, "INVALID_REQUEST", first?.message ?? "Invalid request.", {
      field: first?.path.join(".") ?? "",
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const duplicate = error.code === "P2002";
    sendError(
      req,
      res,
      duplicate ? 409 : 400,
      duplicate ? "CONFLICT" : "INVALID_RELATION",
      duplicate
        ? "A record with the same identifier or version already exists."
        : "A referenced record is invalid or cannot be changed.",
    );
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    sendError(req, res, 400, "INVALID_REQUEST", "Malformed JSON body.");
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    sendError(req, res, 413, "REQUEST_TOO_LARGE", "Request body exceeds the allowed size.");
    return;
  }

  if (error instanceof Error && error.message === "Origin is not allowed.") {
    sendError(req, res, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed.");
    return;
  }

  console.error(JSON.stringify({
    event: "request_failed",
    requestId: req.requestId,
    errorType: error instanceof Error ? error.name : "UnknownError",
  }));
  sendError(req, res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
};
