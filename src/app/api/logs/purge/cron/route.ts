/**
 * GET /api/logs/purge/cron — Vercel cron 전용 (vercel.json: 매일 18:30 UTC = 한국 03:30).
 * 오류 기록을 90일만 둔다(원장님 2026-09-22) — 그보다 오래된 줄과 딸린 크롭 이미지를 지운다.
 *
 * 문지기는 `src/app/api/tests/auto-draft/cron/route.ts` 와 같다: **CRON_SECRET** 을 `Authorization: Bearer` 로.
 * 시크릿이 env 에 없으면 503(잠긴 채로 배포됨), 틀리면 401.
 *
 * 대응 계약: src/contracts/errorLog.contract.ts (errorLogPurgeResponseSchema)
 */
import { errorLogPurgeResponseSchema } from "@/contracts/errorLog.contract";
import { jsonError, jsonOk } from "@/lib/apiResponse";
import { cronSecretMatches } from "@/lib/cronSecret";
import { purgeExpiredErrorLogs } from "@/lib/errorLog/purge";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return jsonError(
      "INTERNAL_ERROR",
      "CRON_SECRET 이 설정되지 않았습니다.",
      503,
    );
  if (!cronSecretMatches(request, secret))
    return jsonError("UNAUTHORIZED", "cron 시크릿이 다릅니다.", 401);
  const result = await purgeExpiredErrorLogs(new Date());
  return jsonOk(errorLogPurgeResponseSchema, { data: result });
}

export const GET = withErrorLog("/api/logs/purge/cron", handleGet);
