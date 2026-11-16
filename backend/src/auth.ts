import { getToken } from "next-auth/jwt";
import type { Request, RequestHandler } from "express";
import { prisma } from "./db.js";
import { sendError } from "./http.js";

declare global {
  // Express request augmentation carries only server-verified identity data.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: "TRADER" | "INTERMEDIARY" | "ADMIN";
      };
    }
  }
}

type RejectReason =
  | "auth_secret_missing"
  | "no_session_cookie"
  | "session_token_undecodable"
  | "token_without_user_id"
  | "user_not_found";

/**
 * Records why a request was refused so a 401/503 can be diagnosed from the
 * server logs. Logs cookie NAMES only, never cookie values, tokens or secrets.
 */
function logRejection(req: Request, reason: RejectReason) {
  const cookieHeader = typeof req.headers.cookie === "string" ? req.headers.cookie : "";
  const cookieNames = cookieHeader
    .split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter((name) => /session-token/.test(name));
  console.warn(JSON.stringify({
    event: "auth_rejected",
    reason,
    requestId: req.requestId,
    sessionCookieNames: cookieNames,
    secureCookieExpected: process.env.NODE_ENV === "production",
  }));
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    logRejection(req, "auth_secret_missing");
    sendError(req, res, 503, "AUTH_NOT_CONFIGURED", "Authentication is not configured.");
    return;
  }

  try {
    const requestHeaders = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === "string") requestHeaders.set(name, value);
      else if (Array.isArray(value)) requestHeaders.set(name, value.join(", "));
    }
    const token = await getToken({
      req: { headers: requestHeaders },
      secret,
      secureCookie: process.env.NODE_ENV === "production",
    });
    const userId = token?.id;
    if (typeof userId !== "string" || userId.length === 0) {
      const hasSessionCookie = /session-token/.test(String(req.headers.cookie ?? ""));
      logRejection(
        req,
        !token && !hasSessionCookie
          ? "no_session_cookie"
          : !token
            ? "session_token_undecodable"
            : "token_without_user_id",
      );
      sendError(req, res, 401, "UNAUTHORIZED", "Authentication required.");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) {
      logRejection(req, "user_not_found");
      sendError(req, res, 401, "UNAUTHORIZED", "Authentication required.");
      return;
    }
    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.authUser?.role !== "ADMIN") {
    sendError(req, res, req.authUser ? 403 : 401, req.authUser ? "FORBIDDEN" : "UNAUTHORIZED",
      req.authUser ? "Administrator access is required." : "Authentication required.");
    return;
  }
  next();
};
