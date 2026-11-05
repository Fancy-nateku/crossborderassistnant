import { proxyBackendRequest } from "@/lib/api/backend";

type Context = { params: Promise<{ id: string; requirementId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id, requirementId } = await params;
  return proxyBackendRequest(
    request,
    `/api/v1/saved-plans/${encodeURIComponent(id)}/checklist-items/${encodeURIComponent(requirementId)}`,
  );
}