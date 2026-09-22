import { randomBankResponse } from "@/lib/unifiedBankSelection";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  return randomBankResponse(request, { "Cache-Control": "no-store" });
}
