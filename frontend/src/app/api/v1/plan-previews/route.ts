import { proxyBackendRequest } from "@/lib/api/backend";

export async function POST(request: Request) {
  return proxyBackendRequest(request, "/api/v1/plan-previews");
}
