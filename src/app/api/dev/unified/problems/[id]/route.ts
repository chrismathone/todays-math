import { loadUnifiedBankProblem } from "@/lib/unifiedPreview";
import { idParamSchema } from "@/contracts/common.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  const headers = { "Cache-Control": "no-store" };
  const parsed = idParamSchema.safeParse(await context.params);
  if (!parsed.success)
    return Response.json(
      { error: "문항 주소를 확인해 주세요." },
      { status: 400, headers },
    );
  const identity = new URL(request.url).searchParams.get("identity");
  if (identity !== null && identity !== "question")
    return Response.json(
      { error: "알 수 없는 문항 보기입니다." },
      { status: 400, headers },
    );
  const row = await loadUnifiedBankProblem(
    parsed.data.id,
    identity === "question" ? "question" : undefined,
  );
  if (!row)
    return Response.json(
      { error: "조회 가능한 문항을 찾을 수 없습니다." },
      { status: 404, headers },
    );
  return Response.json({ data: row }, { headers });
}
export const GET = withErrorLog("/api/dev/unified/problems/[id]", handleGet);
