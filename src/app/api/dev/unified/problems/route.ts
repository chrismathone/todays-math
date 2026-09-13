import { loadUnifiedBank } from "@/lib/unifiedPreview";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  try {
    return Response.json(
      await loadUnifiedBank(new URL(request.url).searchParams),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "문제은행을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}
