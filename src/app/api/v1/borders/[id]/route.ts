import { proxyBackendRequest } from "@/lib/api/backend";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyBackendRequest(request, `/api/v1/borders/${encodeURIComponent(id)}`);
}
