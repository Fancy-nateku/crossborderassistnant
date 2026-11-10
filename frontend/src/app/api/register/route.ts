import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(128),
  })
  .strict();

function fail(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_REQUEST", "Request body must be valid JSON.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail(400, "INVALID_REQUEST", "Check the email and password (8+ characters).");

  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return fail(409, "EMAIL_TAKEN", "That email is already registered.");

  await prisma.user.create({
    data: { email, name: name ?? null, passwordHash: await hashPassword(password) },
  });
  return Response.json({ data: { ok: true } }, { status: 201, headers: { "cache-control": "no-store" } });
}