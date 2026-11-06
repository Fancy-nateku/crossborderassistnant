import { proxyBackendRequest } from "@/lib/api/backend";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyBackendRequest(request, `/api/v1/saved-plans${search}`);
}

export async function POST(request: Request) {
  return proxyBackendRequest(request, "/api/v1/saved-plans");
}