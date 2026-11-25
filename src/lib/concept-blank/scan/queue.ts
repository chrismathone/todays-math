import "server-only";
import { runScanJob, type ScanJob } from "./jobs";
import { scanConfig } from "./model";
import { maintainScanUsage } from "./usageMaintenance";
import type { ScanIdentity } from "./issuance";

type Dependencies = Parameters<typeof runScanJob>[1];
/** One response/cron has one shared 240s budget, including all continuations. */
export async function runScanJobAndQueue(job: ScanJob, deps: Dependencies) {
  const signal = deps.signal ?? AbortSignal.timeout(240_000);
  await runScanJob(job, { ...deps, signal });
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
          `SELECT s.id,s.job_id,s.job_kind,s.job_actor FROM concept_blank_scan_submission s JOIN concept_blank_scan_usage_call c ON c.job_id=s.job_id AND c.submission_id=s.id AND c.status='queued' WHERE s.job_waiting AND s.job_actor IS NOT NULL ORDER BY c.queue_order LIMIT 1 FOR UPDATE OF s SKIP LOCKED`,
        );
        if (!row) return null;
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
      await runScanJob(job, { ...deps, signal });
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
