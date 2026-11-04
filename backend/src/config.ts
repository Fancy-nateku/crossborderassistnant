import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  ALLOWED_ORIGINS: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SOURCE_MAX_AGE_DAYS: z.coerce.number().int().positive().optional(),
  EXCHANGE_RATE_MAX_AGE_DAYS: z.coerce.number().int().positive().optional(),
});
export const config = envSchema.parse(process.env);
if (
  config.NODE_ENV === "production" &&
  (config.SOURCE_MAX_AGE_DAYS === undefined || config.EXCHANGE_RATE_MAX_AGE_DAYS === undefined)
) {
  throw new Error(
    "Production requires owner-approved SOURCE_MAX_AGE_DAYS and EXCHANGE_RATE_MAX_AGE_DAYS policies.",
  );
}
export const allowedOrigins = new Set(
  config.ALLOWED_ORIGINS.split(",").map((origin) => {
    const value = origin.trim();
    const parsed = new URL(value);
    if (parsed.origin !== value || parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error(`Invalid allowed origin: ${value}`);
    }
    return parsed.origin;
  }),
);

if (allowedOrigins.has("*")) {
  throw new Error("Wildcard CORS origins are not supported.");
}
