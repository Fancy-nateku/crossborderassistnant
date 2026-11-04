import { getToken } from "next-auth/jwt";
import type { RequestHandler } from "express";
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

export const authenticate: RequestHandler = async (req, res, next) => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
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
      sendError(req, res, 401, "UNAUTHORIZED", "Authentication required.");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) {
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
