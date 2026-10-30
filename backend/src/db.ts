import { PrismaClient } from "@prisma/client";

const prismaGlobal = globalThis as typeof globalThis & {
  crossBorderPrisma?: PrismaClient;
};

export const prisma =
  prismaGlobal.crossBorderPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.crossBorderPrisma = prisma;
}
