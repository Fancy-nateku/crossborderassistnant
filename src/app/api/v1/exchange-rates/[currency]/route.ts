import { proxyBackendRequest } from "@/lib/api/backend";

export async function GET(
  request: Request,
  context: { params: Promise<{ currency: string }> },
) {
  const { currency } = await context.params;
  return proxyBackendRequest(
    request,
    `/api/v1/exchange-rates/${encodeURIComponent(currency)}`,
  );
}
