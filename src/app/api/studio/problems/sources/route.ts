import { loadBankSourceCounts } from "@/lib/bankSourceCounts";
import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/** 문제은행 «출처 고르기» 창의 수(D-161 H1) — 관문은 이웃 목록 라우트(`../route.ts`)와 같다. */
async function handleGet(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  try {
    return Response.json(await loadBankSourceCounts(), { headers });
  } catch {
    return Response.json(
      { error: "출처별 문항 수를 불러오지 못했습니다." },
      { status: 503, headers },
    );
  }
}

export const GET = withErrorLog("/api/studio/problems/sources", handleGet);
