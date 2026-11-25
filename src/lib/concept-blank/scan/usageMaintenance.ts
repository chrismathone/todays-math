import "server-only";
import type { ScanDatabase, ScanSql } from "./database";
import { lockScanUsage } from "./usageDatabase";

type Row = {
  id: string;
  month: string;
  reserved_nano_usd: string | bigint;
  submission_id: string | null;
  job_id: string | null;
};
async function finish(tx: ScanSql, row: Row, charged: boolean, reason: string) {
  await tx.query(
    `UPDATE concept_blank_scan_usage_month SET reserved_nano_usd=reserved_nano_usd-$2::bigint,spent_nano_usd=spent_nano_usd+$3::bigint,updated_at=CURRENT_TIMESTAMP WHERE month=$1::text`,
    [row.month, row.reserved_nano_usd, charged ? row.reserved_nano_usd : 0],
  );
  await tx.query(
    `UPDATE concept_blank_scan_usage_call SET status='settled',cost_nano_usd=$2::bigint,settlement_reason=$3::text,settled_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
    [row.id, charged ? row.reserved_nano_usd : 0, reason],
  );
}
export async function cancelQueuedScanCalls(db: ScanDatabase, jobId: string) {
  await db.transaction(async (tx) => {
    await lockScanUsage(tx);
    const rows = await tx.query<Row>(
      `SELECT * FROM concept_blank_scan_usage_call WHERE job_id=$1::uuid AND status='queued' FOR UPDATE`,
      [jobId],
    );
    for (const row of rows) await finish(tx, row, false, "queue-cancelled");
  });
}
/** Route ceiling is 300s, operation budget 240s. After 360s a lost worker is
 * charged its FULL bound, not released for free. It is never auto-retried. */
export async function maintainScanUsage(db: ScanDatabase, now = new Date()) {
  const expired = await db.transaction(async (tx) => {
    await lockScanUsage(tx);
    const rows = await tx.query<Row>(
      `SELECT * FROM concept_blank_scan_usage_call WHERE status='running' AND dispatched_at <= $1::timestamptz - interval '360 seconds' FOR UPDATE`,
      [now.toISOString()],
    );
    for (const row of rows) await finish(tx, row, true, "worker-expired");
    const orphaned = await tx.query<Row>(
      `SELECT c.* FROM concept_blank_scan_usage_call c LEFT JOIN concept_blank_scan_submission s ON s.id=c.submission_id WHERE c.status='queued' AND c.submission_id IS NOT NULL AND (s.job_id IS DISTINCT FROM c.job_id OR s.state IN ('graded','teacher-corrected')) FOR UPDATE OF c`,
    );
    const orphanedNames = await tx.query<Row>(
      `SELECT c.* FROM concept_blank_scan_usage_call c WHERE c.status='queued' AND c.submission_id IS NULL AND c.job_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM concept_blank_scan_name_capture n WHERE n.job_id=c.job_id AND n.submission_id IS NULL AND n.deleted_at IS NULL) FOR UPDATE OF c`,
    );
    for (const row of orphanedNames)
      await finish(tx, row, false, "queue-cancelled");
    for (const row of orphaned) await finish(tx, row, false, "queue-cancelled");
    return rows;
  });
  // Never hold the admission lock while taking a submission lock.
  for (const row of expired)
    if (row.submission_id && row.job_id)
      await db.query(
        `UPDATE concept_blank_scan_submission SET job_id=NULL,job_kind=NULL,job_started_at=NULL,job_waiting=false,job_actor=NULL,revision=revision+1,last_error=$3::text WHERE id=$1::uuid AND job_id=$2::uuid`,
        [
          row.submission_id,
          row.job_id,
          "이전 호출의 응답을 확인하지 못해 예약액으로 정산했습니다. 사진과 읽은 답은 유지됩니다. 다시 시도해 주세요.",
        ],
      );
  for (const row of expired)
    if (!row.submission_id && row.job_id)
      await db.query(
        `UPDATE concept_blank_scan_name_capture SET job_id=NULL,job_started_at=NULL,job_waiting=false,last_error=$2::text WHERE job_id=$1::uuid`,
        [
          row.job_id,
          "이전 이름 읽기의 응답을 확인하지 못했습니다. 다시 시도해 주세요.",
        ],
      );
  await db.query(
    `UPDATE concept_blank_scan_name_capture n SET job_waiting=true WHERE n.job_id IS NOT NULL AND n.job_started_at <= $1::timestamptz - interval '360 seconds' AND EXISTS(SELECT 1 FROM concept_blank_scan_usage_call c WHERE c.job_id=n.job_id AND c.status='queued')`,
    [now.toISOString()],
  );
  // A worker may die before it gets as far as admission. No automatic paid retry.
  await db.query(
    `UPDATE concept_blank_scan_name_capture n SET job_id=NULL,job_started_at=NULL,job_waiting=false,last_error=$2::text WHERE n.job_id IS NOT NULL AND n.job_started_at <= $1::timestamptz - interval '360 seconds' AND NOT EXISTS(SELECT 1 FROM concept_blank_scan_usage_call c WHERE c.job_id=n.job_id AND c.status IN ('queued','running'))`,
    [now.toISOString(), "이름 읽기를 마치지 못했습니다. 다시 시도해 주세요."],
  );
  // Crash between queue insertion and returning from after(): still no paid call.
  await db.query(
    `UPDATE concept_blank_scan_submission s SET job_waiting=true WHERE s.job_id IS NOT NULL AND s.job_started_at <= $1::timestamptz - interval '360 seconds' AND EXISTS(SELECT 1 FROM concept_blank_scan_usage_call c WHERE c.job_id=s.job_id AND c.status='queued')`,
    [now.toISOString()],
  );
}
