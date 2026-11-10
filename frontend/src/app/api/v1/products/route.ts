import { proxyBackendRequest } from "@/lib/api/backend";

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  return proxyBackendRequest(request, `/api/v1/products${search}`);
}
