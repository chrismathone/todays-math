/**
 * 보관 정리 — {@link ERROR_LOG_RETENTION_DAYS}일 지난 오류 기록을 지운다(원장님 2026-09-22 «90일 · 매일»).
 * 딸린 크롭 이미지는 FK `ON DELETE CASCADE` 로 같이 지워진다(마이그레이션 20260922120000_error_log).
 *
 * 부르는 곳: `GET /api/logs/purge/cron`(vercel.json — 매일).
 */
import { ERROR_LOG_RETENTION_DAYS } from "@/contracts/errorLogValues";
import { db } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export function errorLogCutoff(now: Date): Date {
  return new Date(now.getTime() - ERROR_LOG_RETENTION_DAYS * DAY_MS);
}

export async function purgeExpiredErrorLogs(now = new Date()) {
  const cutoff = errorLogCutoff(now);
  const { count } = await db.errorLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deleted: count, cutoff: cutoff.toISOString() };
}
