/**
 * GET /api/tests/auto-draft/cron — Vercel cron 전용 (vercel.json: 매일 23:00 UTC = 한국 08:00).
 *
 * 세션이 아니라 **CRON_SECRET** 으로 잠근다 — Vercel cron 은 설정된 시크릿을
 * `Authorization: Bearer <CRON_SECRET>` 로 보낸다. 시크릿이 env 에 없으면 503(잠긴 채로
 * 배포됨), 틀리면 401. 문지기의 결은 `src/app/api/eywa-sync/cron/route.ts` 와 같다.
 *
 * 🔴 **서버 혼자 부를 길이 여기다.** `POST /api/tests/generate` 는 `getSessionUser()` 를
 *    요구한다 — cron 에는 세션이 없다. 그래서 같은 출제 함수(`generateDraftTest`)를
 *    **소유자 계정**(`resolveAutoDraftOwner`)으로 부르는 경로를 따로 낸다. 출제 규칙·
 *    문항 수·난이도 배분은 지금 것 그대로다(새로 짜지 않았다).
 *
 * 초안까지만 — 확정(`confirm`)·인쇄(`print`)는 부르지 않는다(D-129 ⑶).
 *
 * 대응 계약: src/contracts/dailyAutoTest.contract.ts (autoDraftRunResponseSchema)
 */
import type { NextRequest } from "next/server";

import { autoDraftRunResponseSchema } from "@/contracts/dailyAutoTest.contract";
import { jsonError, jsonOk } from "@/lib/apiResponse";
import { cronSecretMatches } from "@/lib/cronSecret";
import { kstDateOf } from "@/lib/kstDate";
import { resolveAutoDraftOwner } from "@/lib/tests/autoDraftOwner";
import { runAutoDraft } from "@/lib/tests/runAutoDraft";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const maxDuration = 300;

async function handleGet(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return jsonError(
      "INTERNAL_ERROR",
      "CRON_SECRET 이 설정되지 않았습니다.",
      503,
    );
  if (!cronSecretMatches(request, secret))
    return jsonError("UNAUTHORIZED", "cron 시크릿이 다릅니다.", 401);

  // 🔴 소유자를 못 찾으면 **오류로 끝낸다.** 조용한 0건은 「매일 도는데 아무것도 안 나오는」
  //    상태를 아무도 못 보게 만든다.
  const resolved = await resolveAutoDraftOwner();
  if (!resolved.ok) return jsonError("INTERNAL_ERROR", resolved.message, 503);

  // ?day=YYYY-MM-DD — 지난 날을 되짚어 볼 때(검증·시연). 기본은 오늘(KST).
  // 「오늘」은 학원 시간이다 — 서버 시계의 UTC 자정이 아니다(`kstDate.ts` 한 곳).
  const dayParam = new URL(request.url).searchParams.get("day");
  const day =
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)
      ? dayParam
      : kstDateOf(new Date());

  try {
    const summary = await runAutoDraft({ day, owner: resolved.owner });
    return jsonOk(autoDraftRunResponseSchema, { data: summary });
  } catch (error) {
    console.error("[GET /api/tests/auto-draft/cron] 자동 초안 실패", error);
    return jsonError(
      "INTERNAL_ERROR",
      "자동 출제 중 오류가 발생했습니다.",
      500,
    );
  }
}

export const GET = withErrorLog("/api/tests/auto-draft/cron", handleGet);
