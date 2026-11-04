// Allowed origins for state-changing requests and CORS
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3100",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3100",
];

export async function validateOrigin(requestOrigin?: string | null): Promise<boolean> {
  if (!requestOrigin) return true; // Direct same-origin or non-browser request

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : [];
  const allowed = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];

  try {
    const originUrl = new URL(requestOrigin).origin;
    return allowed.includes(originUrl);
  } catch {
    return false;
  }
}

// In-memory sliding window rate limiter
// Note: In multi-instance serverless production deployments, an external store (e.g. Redis / Upstash)
// must back this rate limiter. This in-memory implementation protects individual process instances.
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds = 60,
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetInSeconds: windowSeconds };
  }

  if (record.count >= maxRequests) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  record.count += 1;
  const remaining = Math.max(0, maxRequests - record.count);
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return { allowed: true, remaining, resetInSeconds };
}

// Allowed official source domains
const REVIEWED_OFFICIAL_DOMAINS = [
  "kra.go.ke",
  "kratv.kra.go.ke",
  "trademarkafrica.com",
  "erra.trademarkafrica.com",
  "comesa.int",
  "eac.int",
  "customs.eac.int",
  "tradeportal.eac.int",
  "povertyactionlab.org",
  "theigc.org",
  "eprcug.org",
  "ura.go.ug",
];

export function isSafeSourceUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    return REVIEWED_OFFICIAL_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
