import "server-only";
import { saveScanWrittenName } from "./name";
import { createHash, randomUUID } from "node:crypto";
import {
  scanJobInputSchema,
  type ScanJobInput,
} from "@/contracts/conceptBlankScanApi.contract";
import type {
  ScanPage,
  ScanRead,
  ScanTarget,
} from "@/contracts/conceptBlankScan.contract";
import { scanDatabaseError, type ScanDatabase, type ScanSql } from "./database";
import { ScanQueuedError } from "./usage";
import { cancelQueuedScanCalls } from "./usageMaintenance";
import { ScanAccessError, type ScanIdentity } from "./issuance";
import {
  gradeScanPage,
  SCAN_GRADE_PROMPT_VERSION,
  SCAN_GRADE_MARKUP_PROMPT_VERSION,
} from "./grade";
import type { ScanMarkupResult } from "@/contracts/conceptBlankScanMarkup.contract";
import { saveScanMarkupSnapshot } from "./markupStore";
import { readScanPageWithName, SCAN_READ_PROMPT_VERSION } from "./read";
import { scanConfig, type ScanConfig, type ScanModel } from "./model";
import type { ScanPhotoStorage } from "./storage.server";
import {
  assertScanRevision,
  loadScanSubmission,
  scanEvidence,
  scanPhotoAvailable,
  scanPublished,
  SCAN_USED_PHOTO_DAYS,
  type ScanSubmissionRow,
} from "./submission";

// A stale worker is conservatively charged at its bound before a fresh explicit retry.
export const SCAN_JOB_RECLAIM_MS = 360_000;
const RUN_BUDGET_MS = 240_000;
export type ScanJob = {
  id: string;
  submissionId: string;
  kind: "read" | "grade";
  actor: ScanIdentity;
};
type Evidence = Awaited<ReturnType<typeof scanEvidence>>;
type TargetEvidence = { readIds: string[]; correctionIds: string[] };
function assertJob(row: ScanSubmissionRow, job: ScanJob) {
  if (row.job_id !== job.id || row.job_kind !== job.kind || scanPublished(row))
    throw new ScanAccessError(
      "작업의 입력 판이 바뀌었습니다. 최신 상태를 확인해 주세요.",
      409,
    );
}
function completePhotos(
  evidence: Evidence,
  pages: readonly ScanPage[],
  now: Date,
) {
  const missing = pages.filter(
    (page) =>
      !evidence.photos.some(
        (p) => p.page_number === page.number && scanPhotoAvailable(p, now),
      ),
  );
  if (missing.length)
    throw new ScanAccessError(
      `${missing.map((p) => p.number).join(" · ")}쪽 사진이 빠졌거나 만료되었습니다. 모든 쪽을 찍어 주세요.`,
      409,
    );
}
function targetEvidence(
  target: ScanTarget,
  evidence: Evidence,
): TargetEvidence {
  const reads = target.slotIds
    .map((id) => evidence.readings.find((r) => r.slot_id === id))
    .filter((r) => r !== undefined);
  return {
    readIds: reads.map((r) => r.id),
    correctionIds: reads.flatMap((r) => {
      const c = evidence.corrections.findLast((c) => c.read_id === r.id);
      return c ? [c.id] : [];
    }),
  };
}
function savedTarget(target: ScanTarget, evidence: Evidence) {
  const expected = targetEvidence(target, evidence);
  return evidence.grades.findLast(
    (g) =>
      g.target_id === target.id &&
      g.origin !== "teacher" &&
      JSON.stringify(g.evidence.readIds) === JSON.stringify(expected.readIds) &&
      JSON.stringify(g.evidence.correctionIds) ===
        JSON.stringify(expected.correctionIds),
  );
}
function effectiveReadings(page: ScanPage, evidence: Evidence): ScanRead[] {
  return page.slots.map((slot) => {
    const read = evidence.readings.find((r) => r.slot_id === slot.id);
    if (!read)
      throw new ScanAccessError("모든 쪽의 읽기를 마친 뒤 채점해 주세요.", 409);
    const correction = evidence.corrections.findLast(
      (c) => c.read_id === read.id,
    );
    return {
      id: slot.id,
      status: !correction
        ? read.status
        : correction.resolution === "text"
          ? "read"
          : correction.resolution === "blank"
            ? "blank"
            : "unreadable",
      text: correction?.text ?? read.text,
    };
  });
}

export async function beginScanJob(
  actor: ScanIdentity,
  submissionId: string,
  input: ScanJobInput,
  db: ScanDatabase,
  now = new Date(),
): Promise<ScanJob> {
  const parsed = scanJobInputSchema.parse(input);
  return db
    .transaction(async (tx) => {
      const { row, issue } = await loadScanSubmission(
        actor,
        submissionId,
        tx,
        true,
      );
      assertScanRevision(row, parsed.revision);
      if (scanPublished(row))
        throw new ScanAccessError("이미 공개한 답안입니다.", 409);
      if (row.job_id) {
        if (row.job_waiting)
          throw new ScanAccessError("차례를 기다리는 중입니다.", 409);
        if (
          !row.job_started_at ||
          now.getTime() - row.job_started_at.getTime() < SCAN_JOB_RECLAIM_MS
        )
          throw new ScanAccessError(
            "답안을 읽거나 채점하는 중입니다. 진행 상태를 확인해 주세요.",
            409,
          );
        const uncertain = await tx.query(
          `SELECT id FROM concept_blank_scan_usage_call WHERE submission_id=$1::uuid AND status IN ('running','queued') LIMIT 1`,
          [submissionId],
        );
        if (uncertain.length)
          throw new ScanAccessError(
            "이전 호출을 마무리하고 있습니다. 사진과 읽은 답은 유지됩니다. 잠시 뒤 다시 시도해 주세요.",
            503,
          );
      }
      if (
        parsed.kind === "read"
          ? !["capturing", "read"].includes(row.state)
          : row.state !== "checking"
      )
        throw new ScanAccessError(
          "현재 답안 단계에서 할 수 없는 작업입니다.",
          409,
        );
      const evidence = await scanEvidence(tx, submissionId);
      completePhotos(evidence, issue.snapshot.pages, now);
      if (parsed.kind === "grade")
        for (const page of issue.snapshot.pages)
          effectiveReadings(page, evidence);
      const wantsMarkup = row.job_id
        ? row.job_actor?.markup === true
        : process.env.CONCEPT_BLANK_SCAN_MARKUP === "on";
      const markup =
        parsed.kind === "grade" &&
        wantsMarkup &&
        (
          await tx.query<{ available: boolean }>(
            "SELECT to_regclass('concept_blank_scan_markup') IS NOT NULL AS available",
          )
        )[0]?.available;
      const id = randomUUID();
      await tx.query(
        `UPDATE concept_blank_scan_submission SET job_id=$2::uuid,job_kind=$3::text,job_started_at=$4::timestamptz,state=$5::text,job_waiting=false,job_actor=$6::jsonb,revision=revision+1,last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
        [
          submissionId,
          id,
          parsed.kind,
          now.toISOString(),
          parsed.kind === "read" ? "read" : "checking",
          JSON.stringify(markup ? { ...actor, markup: true } : actor),
        ],
      );
      if (parsed.kind === "grade")
        await tx.query(
          `UPDATE concept_blank_scan_photo SET used_at=COALESCE(used_at,$2::timestamptz),expires_at=created_at+interval '1 day'*$3::int WHERE submission_id=$1::uuid AND is_current`,
          [submissionId, now.toISOString(), SCAN_USED_PHOTO_DAYS],
        );
      return { id, submissionId, kind: parsed.kind, actor };
    })
    .catch(scanDatabaseError);
}

/** Only allowlisted operational messages reach students; provider text may contain private input. */
export function scanJobFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("월 사용 상한"))
    return "사진 채점의 월 사용 상한에 필요한 금액이 남지 않았습니다. 사진과 읽은 답은 유지됩니다.";
  if (message.includes("꺼져"))
    return "사진 채점이 잠시 꺼져 있습니다. 사진과 읽은 답은 유지됩니다.";
  if (message.includes("진행 중인 사진 채점"))
    return "다른 답안을 처리하고 있습니다. 잠시 뒤 이어서 진행해 주세요. 이미 읽은 답은 다시 읽지 않습니다.";
  if (message.includes("사용량") || message.includes("이미 실행한 사진 채점"))
    return "이전 처리를 마치지 못했습니다. 사진과 읽은 답은 유지됩니다. 다시 시도해 주세요.";
  if (message.includes("서버 키"))
    return "사진 채점 서버 설정을 확인해야 합니다. 사진과 읽은 답은 유지됩니다.";
  if (error instanceof ScanAccessError) return message;
  return "처리를 마치지 못했습니다. 사진과 완료된 읽기는 유지됩니다. 잠시 뒤 이어서 진행해 주세요.";
}

/** Independent from the HTTP request signal. Call from Next after(); persist each completed page. */
export async function runScanJob(
  job: ScanJob,
  deps: {
    db: ScanDatabase;
    storage: ScanPhotoStorage;
    model: (
      requestKey: string,
      submissionId?: string,
      attemptKey?: string,
    ) => ScanModel;
    signal?: AbortSignal;
    config?: ScanConfig;
    now?: () => Date;
    onError?: (error: unknown) => Promise<void>;
  },
) {
  const config = deps.config ?? scanConfig(),
    signal = deps.signal ?? AbortSignal.timeout(RUN_BUDGET_MS),
    now = () => deps.now?.() ?? new Date();
  const context = async (sql: ScanSql, lock = false) => {
    const value = await loadScanSubmission(
      job.actor,
      job.submissionId,
      sql,
      lock,
    );
    assertJob(value.row, job);
    return value;
  };
  try {
    const { issue, row } = await context(deps.db);
    const markupEnabled = row.job_actor?.markup === true;
    for (const page of issue.snapshot.pages) {
      signal.throwIfAborted();
      await context(deps.db);
      const evidence = await scanEvidence(deps.db, job.submissionId);
      completePhotos(evidence, [page], now());
      if (job.kind === "read") {
        const photo = evidence.photos.find(
          (p) => p.page_number === page.number,
        )!;
        if (
          page.slots.every((s) =>
            evidence.readings.some(
              (r) => r.photo_id === photo.id && r.slot_id === s.id,
            ),
          )
        )
          continue;
        if (photo.bucket !== deps.storage.bucket)
          throw new Error("사진 저장소 설정 확인 필요");
        const bytes = await deps.storage.read(
          photo.object_key,
          photo.content_sha256,
          photo.mime_type,
        );
        const { readings, writtenName } = await readScanPageWithName(
          {
            page,
            imageDataUrl: `data:${photo.mime_type};base64,${bytes.toString("base64")}`,
            signal,
            onMalformedOutput: deps.onError,
          },
          deps.model(
            `read:${job.submissionId}:${photo.id}`,
            job.submissionId,
            job.id,
          ),
        );
        await deps.db.transaction(async (tx) => {
          await context(tx, true);
          if (writtenName)
            await saveScanWrittenName(
              job.actor,
              job.submissionId,
              writtenName,
              tx,
            );
          for (const reading of readings)
            await tx.query(
              `INSERT INTO concept_blank_scan_read(id,submission_id,photo_id,slot_id,status,text,prompt_version,requested_model) VALUES($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text,$8::text) ON CONFLICT(photo_id,slot_id) DO NOTHING`,
              [
                randomUUID(),
                job.submissionId,
                photo.id,
                reading.id,
                reading.status,
                reading.text,
                SCAN_READ_PROMPT_VERSION,
                config.model,
              ],
            );
        });
      } else {
        if (page.targets.every((t) => savedTarget(t, evidence))) continue;
        const readings = effectiveReadings(page, evidence);
        let markup: ScanMarkupResult | undefined;
        let recoveredLegacy = false;
        const modelTargets = new Set<string>();
        const identity = createHash("sha256")
          .update(
            JSON.stringify(
              page.targets.map((t) => targetEvidence(t, evidence)),
            ),
          )
          .digest("hex");
        const grades = await gradeScanPage(
          {
            page,
            readings,
            corrections: [],
            ...(markupEnabled
              ? {
                  markup: {
                    originalReadings: evidence.readings.map((read) => ({
                      id: read.slot_id,
                      status: read.status,
                      text: read.text,
                    })),
                    correctedSlotIds: evidence.corrections.map(
                      ({ slot_id }) => slot_id,
                    ),
                    onRecovered: () => {
                      recoveredLegacy = true;
                    },
                    onNotes: (result: ScanMarkupResult) => {
                      markup = result;
                    },
                  },
                }
              : {}),
            signal,
            onMalformedOutput: deps.onError,
            onModelTargets: (ids) => ids.forEach((id) => modelTargets.add(id)),
          },
          deps.model(
            `grade:${job.submissionId}:${page.number}:${identity}`,
            job.submissionId,
            job.id,
          ),
        );
        await deps.db.transaction(async (tx) => {
          await context(tx, true);
          const persisted = await scanEvidence(tx, job.submissionId);
          for (const grade of grades) {
            const target = page.targets.find((t) => t.id === grade.id)!;
            if (savedTarget(target, persisted)) continue;
            const proof = targetEvidence(target, evidence),
              sequence =
                1 +
                Math.max(
                  0,
                  ...persisted.grades
                    .filter((g) => g.target_id === target.id)
                    .map((g) => g.sequence),
                );
            const gradeId = randomUUID();
            const promptVersion = modelTargets.has(target.id)
              ? markupEnabled && !recoveredLegacy
                ? SCAN_GRADE_MARKUP_PROMPT_VERSION
                : SCAN_GRADE_PROMPT_VERSION
              : null;
            const model = promptVersion ? config.gradeModel : null;
            await tx.query(
              `INSERT INTO concept_blank_scan_grade(id,submission_id,target_id,sequence,label,reason,directly_entered,evidence,origin,prompt_version,requested_model) VALUES($1::uuid,$2::uuid,$3::text,$4::int,$5::text,$6::text,$7::boolean,$8::jsonb,$9::text,$10::text,$11::text)`,
              [
                gradeId,
                job.submissionId,
                target.id,
                sequence,
                grade.label,
                grade.reason,
                proof.correctionIds.length > 0,
                JSON.stringify(proof),
                modelTargets.has(target.id) ? "model" : "rule",
                promptVersion,
                model,
              ],
            );
            if (markupEnabled) {
              const photo = evidence.photos.find(
                (photo) => photo.page_number === page.number,
              )!;
              await saveScanMarkupSnapshot(tx, {
                submissionId: job.submissionId,
                gradeId,
                photoId: photo.id,
                promptVersion,
                model,
                notes:
                  markup?.notes.filter((note) => note.targetId === target.id) ??
                  [],
                failed:
                  !!promptVersion &&
                  !!markup?.dropped.some(
                    (entry) =>
                      entry.index === -1 || entry.targetId === target.id,
                  ),
              });
            }
          }
        });
      }
    }
    await deps.db.transaction(async (tx) => {
      const { issue } = await context(tx, true);
      const evidence = await scanEvidence(tx, job.submissionId);
      completePhotos(evidence, issue.snapshot.pages, now());
      for (const page of issue.snapshot.pages) {
        effectiveReadings(page, evidence);
        if (
          job.kind === "grade" &&
          !page.targets.every((t) => savedTarget(t, evidence))
        )
          throw new Error("판정 근거가 모두 저장되지 않았습니다.");
      }
      await tx.query(
        `UPDATE concept_blank_scan_submission SET state=$2::text,job_id=NULL,job_kind=NULL,job_started_at=NULL,job_waiting=false,job_actor=NULL,revision=revision+1,last_error=NULL,graded_at=CASE WHEN $2::text='graded' THEN CURRENT_TIMESTAMP ELSE graded_at END,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
        [job.submissionId, job.kind === "read" ? "checking" : "graded"],
      );
    });
  } catch (error) {
    const queued =
      error instanceof ScanQueuedError ||
      (signal.aborted &&
        (
          await deps.db.query(
            `SELECT id FROM concept_blank_scan_usage_call WHERE job_id=$1::uuid AND status='queued' LIMIT 1`,
            [job.id],
          )
        ).length > 0);
    if (queued) {
      await deps.db.query(
        `UPDATE concept_blank_scan_submission SET job_waiting=true,last_error=NULL WHERE id=$1::uuid AND job_id=$2::uuid AND state NOT IN ('graded','teacher-corrected')`,
        [job.submissionId, job.id],
      );
      return;
    }
    await cancelQueuedScanCalls(deps.db, job.id);
    // CAS prevents an old worker (including a reclaimed lease) from touching newer/public state.
    await deps.db
      .query(
        `UPDATE concept_blank_scan_submission SET job_id=NULL,job_kind=NULL,job_started_at=NULL,job_waiting=false,job_actor=NULL,revision=revision+1,last_error=$3::text,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid AND job_id=$2::uuid AND state NOT IN ('graded','teacher-corrected')`,
        [job.submissionId, job.id, scanJobFailureMessage(error)],
      )
      .catch(scanDatabaseError);
    await deps.onError?.(error);
  }
}
