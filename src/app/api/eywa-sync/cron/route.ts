/**
 * GET /api/eywa-sync/cron — Vercel cron 전용 (예전 vercel.json: 매일 22:30 UTC = 한국 07:30).
 *
 * 🔴 **2026-09-18 부터 cron 에서 뺐다 — 지금은 아무것도 이 경로를 부르지 않는다.** eywa 진도 동기화 보류
 *    (D-129 ⑸ · 원장님 2026-09-18 «꺼»). 다시 켜려면 `vercel.json` 과 `vercelCrons.test.ts` 를 같이 고친다.
 *
 * 세션이 아니라 **CRON_SECRET** 으로 잠근다 — Vercel cron 은 설정된 시크릿을
 * `Authorization: Bearer <CRON_SECRET>` 로 보낸다. 시크릿이 env 에 없으면
 * 503(잠긴 채로 배포됨), 틀리면 401. 사람용 「지금 가져오기」는 POST /api/eywa-sync.
 *
 * 실행부는 POST 와 같은 `executeSyncResponse` 하나다 — 문지기만 다르다.
 */
import type { NextRequest } from "next/server";

import { jsonError } from "@/lib/apiResponse";
import { cronSecretMatches } from "@/lib/cronSecret";

import { executeSyncResponse } from "../route";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const maxDuration = 300;

async function handleGet(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return jsonError(
      "EYWA_SYNC_FAILED",
      "CRON_SECRET 이 설정되지 않았습니다.",
      503,
    );
  if (!cronSecretMatches(request, secret))
    return jsonError("UNAUTHORIZED", "cron 시크릿이 다릅니다.", 401);
  return executeSyncResponse();
}

export const GET = withErrorLog("/api/eywa-sync/cron", handleGet);
