import { proxyBackendRequest } from "@/lib/api/backend";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyBackendRequest(request, `/api/v1/saved-plans/${encodeURIComponent(id)}`);
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyBackendRequest(request, `/api/v1/saved-plans/${encodeURIComponent(id)}`);
}