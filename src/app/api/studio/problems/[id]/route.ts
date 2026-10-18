import { db } from "@/lib/db";
import { idParamSchema } from "@/contracts/common.contract";
import { problemVisibleWhere } from "@/lib/problemPool";
import { UNIFIED_PROBLEM_SELECT, toBankProblem } from "@/lib/unifiedPreview";
import { withProblemSourceReferences } from "@/lib/problem/sourceReference";
import { withQuestionMetadata } from "@/lib/problem/questionQueries";
import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  const parsed = idParamSchema.safeParse(await context.params);
  if (!parsed.success)
    return Response.json(
      { error: "문항 주소를 확인해 주세요." },
      { status: 400, headers },
    );
  const row = await db.problem.findFirst({
    where: { AND: [{ id: parsed.data.id }, problemVisibleWhere()] },
    select: UNIFIED_PROBLEM_SELECT,
  });
  if (!row)
    return Response.json(
      { error: "조회 가능한 문항을 찾을 수 없습니다." },
      { status: 404, headers },
    );
  const identity = new URL(request.url).searchParams.get("identity");
  if (identity !== null && identity !== "question")
    return Response.json(
      { error: "알 수 없는 문항 보기입니다." },
      { status: 400, headers },
    );
  const rows =
    identity === "question" ? await withQuestionMetadata([row]) : [row];
  return Response.json(
    {
      data: toBankProblem((await withProblemSourceReferences(rows))[0]!),
    },
    { headers },
  );
}

export const GET = withErrorLog("/api/studio/problems/[id]", handleGet);
