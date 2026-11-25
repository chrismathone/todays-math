import "server-only";
import { runScanNameCapture } from "./nameCapture";
import { beginScanJob, runScanJob, type ScanJob } from "./jobs";
import { scanConfig } from "./model";
import { maintainScanUsage } from "./usageMaintenance";
import type { ScanIdentity } from "./issuance";

type Dependencies = Parameters<typeof runScanJob>[1] & {
  /** 운영 경로: 읽기가 끝나면 확인 단계 없이 바로 채점한다(원장님 2026-11-25 «지금은 채점만 하면 됨»). */
  gradeAfterRead?: boolean;
};
/** 읽기를 오류 없이 마친 답안만 채점으로 잇는다. 실패 · 대기 · 다른 작업이 잡은 답안은 그대로 둔다. */
async function continueToGrade(job: ScanJob, deps: Dependencies) {
  if (!deps.gradeAfterRead || job.kind !== "read") return;
  const [row] = await deps.db.query<{
    state: string;
    job_id: string | null;
    last_error: string | null;
    revision: number;
  }>(
    `SELECT state,job_id,last_error,revision FROM concept_blank_scan_submission WHERE id=$1::uuid`,
    [job.submissionId],
  );
  if (!row || row.state !== "checking" || row.job_id || row.last_error) return;
  let next: ScanJob;
  try {
    next = await beginScanJob(
      job.actor,
      job.submissionId,
      { revision: row.revision, kind: "grade" },
      deps.db,
    );
  } catch (error) {
    await deps.onError?.(error);
    return;
  }
  await runScanJob(next, deps);
}
/** One response/cron has one shared 240s budget, including all continuations. */
export async function runScanJobAndQueue(job: ScanJob, deps: Dependencies) {
  const signal = deps.signal ?? AbortSignal.timeout(240_000);
  await runScanJob(job, { ...deps, signal });
  await continueToGrade(job, { ...deps, signal });
  await runQueuedScanJobs({ ...deps, signal });
}
export async function runQueuedScanJobs(deps: Dependencies) {
  const signal = deps.signal ?? AbortSignal.timeout(240_000);
  const config = deps.config ?? scanConfig();
  await maintainScanUsage(deps.db, deps.now?.() ?? new Date());
  const worker = async () => {
    while (!signal.aborted) {
      const job = await deps.db.transaction(async (tx) => {
        const [count] = await tx.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM concept_blank_scan_usage_call WHERE status='running'`,
        );
        if (count.n >= config.maxConcurrent) return null;
        const [row] = await tx.query<{
          id: string;
          job_id: string;
          job_kind: "read" | "grade";
          job_actor: ScanIdentity;
        }>(
          `SELECT s.id,s.job_id,s.job_kind,s.job_actor FROM concept_blank_scan_submission s JOIN concept_blank_scan_usage_call c ON c.job_id=s.job_id AND c.submission_id=s.id AND c.status='queued' WHERE c.id=(SELECT id FROM concept_blank_scan_usage_call WHERE status='queued' ORDER BY queue_order LIMIT 1) AND s.job_waiting AND s.job_actor IS NOT NULL ORDER BY c.queue_order LIMIT 1 FOR UPDATE OF s SKIP LOCKED`,
        );
        if (!row) {
          const [capture] = await tx.query<{ id: string; job_id: string }>(
            `SELECT n.id,n.job_id FROM concept_blank_scan_name_capture n JOIN concept_blank_scan_usage_call c ON c.job_id=n.job_id AND c.status='queued' WHERE c.id=(SELECT id FROM concept_blank_scan_usage_call WHERE status='queued' ORDER BY queue_order LIMIT 1) AND n.job_waiting AND n.submission_id IS NULL AND n.deleted_at IS NULL ORDER BY c.queue_order LIMIT 1 FOR UPDATE OF n SKIP LOCKED`,
          );
          if (!capture) return null;
          await tx.query(
            `UPDATE concept_blank_scan_name_capture SET job_waiting=false,job_started_at=CURRENT_TIMESTAMP WHERE id=$1::uuid AND job_id=$2::uuid`,
            [capture.id, capture.job_id],
          );
          return {
            nameCapture: true as const,
            id: capture.id,
            jobId: capture.job_id,
          };
        }
        await tx.query(
          `UPDATE concept_blank_scan_submission SET job_waiting=false,job_started_at=CURRENT_TIMESTAMP WHERE id=$1::uuid AND job_id=$2::uuid`,
          [row.id, row.job_id],
        );
        return {
          id: row.job_id,
          submissionId: row.id,
          kind: row.job_kind,
          actor: row.job_actor,
        };
      });
      if (!job) return;
      if (job.nameCapture) {
        await runScanNameCapture(job, { ...deps, signal });
        const [pending] = await deps.db.query<{ job_waiting: boolean }>(
          `SELECT job_waiting FROM concept_blank_scan_name_capture WHERE id=$1::uuid AND job_id=$2::uuid`,
          [job.id, job.jobId],
        );
        if (pending?.job_waiting) return;
        continue;
      }
      await runScanJob(job, { ...deps, signal });
      await continueToGrade(job, { ...deps, signal });
      const [waiting] = await deps.db.query<{ job_waiting: boolean }>(
        `SELECT job_waiting FROM concept_blank_scan_submission WHERE id=$1::uuid AND job_id=$2::uuid`,
        [job.submissionId, job.id],
      );
      if (waiting?.job_waiting) return; // another worker owns the FIFO head/remaining slots
    }
  };
  // A cron can replenish all slots even when every browser has been closed.
  // Each begin() still rechecks the service-wide limit atomically.
  await Promise.all(
    Array.from({ length: Math.min(config.maxConcurrent, 32) }, worker),
  );
}
