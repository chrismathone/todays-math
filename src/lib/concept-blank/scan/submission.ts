import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  scanCorrectionInputSchema,
  scanOverrideInputSchema,
  scanPhotoInputSchema,
  scanStartInputSchema,
  scanSubmissionViewSchema,
  type ScanCorrectionInput,
  type ScanOverrideInput,
  type ScanPhotoInput,
  type ScanStartInput,
} from "@/contracts/conceptBlankScanApi.contract";
import type { ScanSubmissionState } from "@/contracts/conceptBlankScan.contract";
import { scanRegistrationSchema } from "@/contracts/conceptBlankScanPhoto.contract";
import { scanDatabaseError, type ScanDatabase, type ScanSql } from "./database";
import {
  ScanAccessError,
  scanSubmissionAccess,
  type ScanIdentity,
} from "./issuance";
import { inspectScanPhoto } from "./photo.server";
import { prepareScanPhoto } from "./flatten.server";
import type { ScanPhotoStorage } from "./storage.server";
import { toStudentScanSnapshot } from "./snapshot";

export type ScanSubmissionRow = {
  id: string;
  printed_sheet_id: string;
  student_id: string;
  written_name: string | null;
  written_name_status: "read" | "uncertain" | "unreadable" | "blank" | null;
  name_match_result: string | null;
  name_match_method: string | null;
  captured_student_id: string | null;
  captured_teacher_id: string | null;
  state: ScanSubmissionState;
  revision: number;
  job_id: string | null;
  job_kind: "read" | "grade" | null;
  job_started_at: Date | null;
  job_waiting: boolean;
  job_actor: ScanIdentity | null;
  last_error: string | null;
  graded_at: Date | null;
};
export type ScanPhotoRow = {
  id: string;
  submission_id: string;
  page_number: number;
  version: number;
  is_current: boolean;
  bucket: string;
  object_key: string;
  content_sha256: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  registration: unknown;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
  delete_requested_at: Date | null;
  deleted_at: Date | null;
};
export type ScanReadRow = {
  id: string;
  photo_id: string;
  slot_id: string;
  status: "read" | "blank" | "uncertain" | "unreadable";
  text: string;
};
export type ScanCorrectionRow = {
  id: string;
  read_id: string;
  slot_id: string;
  resolution: "text" | "blank" | "review";
  text: string;
  student_actor_id: string | null;
  teacher_actor_id: string | null;
  sequence: number;
  created_at: Date;
};
export type ScanGradeRow = {
  id: string;
  target_id: string;
  label: "correct" | "partial" | "incorrect" | "review";
  reason: string;
  directly_entered: boolean;
  origin: "rule" | "model" | "teacher";
  sequence: number;
  created_at: Date;
  evidence: { readIds: string[]; correctionIds: string[] };
};
export const SCAN_UNUSED_PHOTO_DAYS = 7;
export const SCAN_USED_PHOTO_DAYS = 30;
export const scanPublished = (row: ScanSubmissionRow) =>
  row.state === "graded" || row.state === "teacher-corrected";
export const scanPhotoAvailable = (photo: ScanPhotoRow, now = new Date()) =>
  !photo.deleted_at && !photo.delete_requested_at && photo.expires_at > now;
export function assertScanRevision(row: ScanSubmissionRow, revision: number) {
  if (row.revision !== revision)
    throw new ScanAccessError(
      "다른 요청에서 답안이 바뀌었습니다. 최신 상태를 다시 확인해 주세요.",
      409,
    );
}
export function assertScanEditable(row: ScanSubmissionRow) {
  if (scanPublished(row))
    throw new ScanAccessError(
      "이미 공개된 답안은 학생이 고칠 수 없습니다. 교사에게 확인을 요청해 주세요.",
      409,
    );
  if (row.job_id)
    throw new ScanAccessError("읽기·채점 중에는 답안을 고칠 수 없습니다.", 409);
}

/** Call with lock=true only inside a transaction. Every mutation locks this same parent. */
export async function loadScanSubmission(
  actor: ScanIdentity,
  id: string,
  sql: ScanSql,
  lock = false,
) {
  const [row] = await sql
    .query<ScanSubmissionRow>(
      `SELECT * FROM concept_blank_scan_submission WHERE id=$1::uuid${lock ? " FOR UPDATE" : ""}`,
      [z.uuid().parse(id)],
    )
    .catch(scanDatabaseError);
  if (!row) throw new ScanAccessError("답안을 찾을 수 없습니다.", 404);
  const access = await scanSubmissionAccess(
    actor,
    row.printed_sheet_id,
    row.student_id,
    sql,
  );
  return { row, ...access };
}
export async function scanEvidence(sql: ScanSql, submissionId: string) {
  const photos = await sql.query<ScanPhotoRow>(
    `SELECT * FROM concept_blank_scan_photo WHERE submission_id=$1::uuid AND is_current ORDER BY page_number`,
    [submissionId],
  );
  const readings = await sql.query<ScanReadRow>(
    `SELECT r.* FROM concept_blank_scan_read r JOIN concept_blank_scan_photo p ON p.id=r.photo_id WHERE r.submission_id=$1::uuid AND p.is_current ORDER BY p.page_number,r.slot_id`,
    [submissionId],
  );
  const corrections = await sql.query<ScanCorrectionRow>(
    `SELECT c.* FROM concept_blank_scan_correction c JOIN concept_blank_scan_read r ON r.id=c.read_id JOIN concept_blank_scan_photo p ON p.id=r.photo_id WHERE c.submission_id=$1::uuid AND p.is_current ORDER BY c.sequence`,
    [submissionId],
  );
  const grades = await sql.query<ScanGradeRow>(
    `SELECT * FROM concept_blank_scan_grade WHERE submission_id=$1::uuid ORDER BY sequence,created_at,id`,
    [submissionId],
  );
  return { photos, readings, corrections, grades };
}

export async function beginScanSubmission(
  actor: ScanIdentity,
  input: ScanStartInput,
  db: ScanDatabase,
) {
  const parsed = scanStartInputSchema.parse(input);
  const studentId =
    parsed.studentId ?? (actor.kind === "student" ? actor.id : undefined);
  if (!studentId)
    throw new ScanAccessError("촬영 전에 학생을 골라 주세요.", 400);
  return db
    .transaction(async (tx) => {
      await scanSubmissionAccess(actor, parsed.printedSheetId, studentId, tx);
      const id = randomUUID();
      await tx.query(
        `INSERT INTO concept_blank_scan_submission (id,printed_sheet_id,student_id,captured_student_id,captured_teacher_id,request_id) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid) ON CONFLICT(request_id) DO NOTHING`,
        [
          id,
          parsed.printedSheetId,
          studentId,
          actor.kind === "student" ? actor.id : null,
          actor.kind === "teacher" ? actor.id : null,
          parsed.requestId,
        ],
      );
      const [row] = await tx.query<ScanSubmissionRow>(
        `SELECT * FROM concept_blank_scan_submission WHERE request_id=$1::uuid`,
        [parsed.requestId],
      );
      if (
        row.printed_sheet_id !== parsed.printedSheetId ||
        row.student_id !== studentId ||
        (actor.kind === "student"
          ? row.captured_student_id
          : row.captured_teacher_id) !== actor.id
      )
        throw new ScanAccessError(
          "같은 요청으로 다른 제출을 만들 수 없습니다.",
          409,
        );
      return { id: row.id };
    })
    .catch(scanDatabaseError);
}

export async function getScanSubmission(
  actor: ScanIdentity,
  id: string,
  db: ScanDatabase,
  now = new Date(),
) {
  return db
    .transaction(async (tx) => {
      const { row, issue, student } = await loadScanSubmission(
        actor,
        id,
        tx,
        true,
      );
      const evidence = await scanEvidence(tx, id);
      const targets = new Map(
        issue.snapshot.pages.flatMap((page) =>
          page.targets.map((target) => [target.id, { page, target }] as const),
        ),
      );
      return scanSubmissionViewSchema.parse({
        id: row.id,
        printedSheetId: issue.id,
        student: {
          id: student.id,
          name: student.name,
          className: student.className,
        },
        writtenName: row.written_name_status
          ? {
              text: row.written_name ?? "",
              status: row.written_name_status,
              result: row.name_match_result ?? "none",
              method:
                row.name_match_method ??
                (row.captured_student_id
                  ? "student-account"
                  : "teacher-selected"),
            }
          : null,
        canChangeStudent:
          actor.kind === "teacher" &&
          !row.captured_student_id &&
          !scanPublished(row),
        role: actor.kind,
        state: row.state,
        revision: row.revision,
        job: row.job_id
          ? {
              kind: row.job_kind,
              startedAt: row.job_started_at!.toISOString(),
              waiting: row.job_waiting,
            }
          : null,
        lastError: row.last_error,
        snapshot: toStudentScanSnapshot(issue.snapshot),
        photos: evidence.photos.map((p) => ({
          id: p.id,
          page: p.page_number,
          version: p.version,
          width: p.width,
          height: p.height,
          registration: scanRegistrationSchema.parse(p.registration),
          available: scanPhotoAvailable(p, now),
          expiresAt: p.expires_at.toISOString(),
        })),
        readings: evidence.readings.map((r) => ({
          id: r.id,
          photoId: r.photo_id,
          slotId: r.slot_id,
          status: r.status,
          text: r.text,
        })),
        corrections: evidence.corrections.map((c) => ({
          id: c.id,
          readId: c.read_id,
          slotId: c.slot_id,
          resolution: c.resolution,
          text: c.text,
          directlyEntered: true,
          by: c.student_actor_id ? "student" : "teacher",
          sequence: c.sequence,
          at: c.created_at.toISOString(),
        })),
        grades: scanPublished(row)
          ? evidence.grades.map((g) => {
              const found = targets.get(g.target_id);
              if (!found)
                throw new Error("저장된 판정 대상을 확인해야 합니다.");
              const { page, target } = found;
              const slots = page.slots.filter((s) =>
                target.slotIds.includes(s.id),
              );
              const unit =
                page.form === "recall"
                  ? "개념"
                  : target.kind === "cloze"
                    ? "빈칸"
                    : slots.every((s) => s.kind === "figure-tag")
                      ? "이름표"
                      : slots.every((s) => s.kind === "figure-line")
                        ? "설명 칸"
                        : "문항";
              return {
                id: g.id,
                targetId: g.target_id,
                page: page.number,
                questionId: target.questionId,
                slotIds: target.slotIds,
                unit,
                label: g.label,
                reason: g.reason,
                directlyEntered: g.directly_entered,
                origin: g.origin,
                sequence: g.sequence,
                at: g.created_at.toISOString(),
              };
            })
          : [],
      });
    })
    .catch(scanDatabaseError);
}

export async function addScanPhoto(
  actor: ScanIdentity,
  id: string,
  input: ScanPhotoInput,
  deps: {
    db: ScanDatabase;
    storage: ScanPhotoStorage;
    origin: string;
    now?: () => Date;
  },
) {
  const parsed = scanPhotoInputSchema.parse(input),
    now = deps.now?.() ?? new Date();
  const initial = await loadScanSubmission(actor, id, deps.db);
  assertScanRevision(initial.row, parsed.revision);
  assertScanEditable(initial.row);
  const inspected = await inspectScanPhoto(parsed.imageDataUrl, {
    printedSheetId: initial.issue.id,
    pageCount: initial.issue.snapshot.pageCount,
    origin: deps.origin,
  });
  const page = initial.issue.layout.pages.find(
    (p) => p.part === "student" && p.number === inspected.qr.page,
  )!;
  const prepared = await prepareScanPhoto(inspected, page);
  const registration = prepared.registration;
  const photoId = randomUUID(),
    objectKey = `${initial.issue.userId}/${id}/${photoId}`;
  // Stage metadata BEFORE uploading, so a crashed/failed upload still has a deletion candidate.
  const stagedRevision = await deps.db
    .transaction(async (tx) => {
      const { row } = await loadScanSubmission(actor, id, tx, true);
      assertScanRevision(row, parsed.revision);
      assertScanEditable(row);
      const [version] = await tx.query<{ next: number }>(
        `SELECT COALESCE(MAX(version),0)+1 AS next FROM concept_blank_scan_photo WHERE submission_id=$1::uuid AND page_number=$2::int`,
        [id, inspected.qr.page],
      );
      await tx.query(
        `INSERT INTO concept_blank_scan_photo(id,submission_id,page_number,version,is_current,bucket,object_key,content_sha256,mime_type,width,height,registration,created_at,expires_at) VALUES($1::uuid,$2::uuid,$3::int,$4::int,false,$5::text,$6::text,$7::text,$8::text,$9::int,$10::int,$11::jsonb,$12::timestamptz,$13::timestamptz)`,
        [
          photoId,
          id,
          inspected.qr.page,
          version.next,
          deps.storage.bucket,
          objectKey,
          prepared.hash,
          prepared.mime,
          prepared.width,
          prepared.height,
          JSON.stringify(registration),
          now.toISOString(),
          new Date(
            now.getTime() + SCAN_UNUSED_PHOTO_DAYS * 86400_000,
          ).toISOString(),
        ],
      );
      await tx.query(
        `UPDATE concept_blank_scan_submission SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
        [id],
      );
      return row.revision + 1;
    })
    .catch(scanDatabaseError);
  await deps.storage.upload(objectKey, prepared.bytes, prepared.mime);
  await deps.db
    .transaction(async (tx) => {
      const { row } = await loadScanSubmission(actor, id, tx, true);
      assertScanRevision(row, stagedRevision);
      assertScanEditable(row);
      await tx.query(
        `UPDATE concept_blank_scan_photo SET is_current=false WHERE submission_id=$1::uuid AND page_number=$2::int AND is_current`,
        [id, inspected.qr.page],
      );
      await tx.query(
        `UPDATE concept_blank_scan_photo SET is_current=true WHERE id=$1::uuid`,
        [photoId],
      );
      if (inspected.qr.page === 1)
        await tx.query(
          `UPDATE concept_blank_scan_submission SET written_name=NULL,written_name_status=NULL,name_match_result=NULL WHERE id=$1::uuid`,
          [id],
        );
      await tx.query(
        `UPDATE concept_blank_scan_submission SET state='capturing',revision=revision+1,last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
        [id],
      );
    })
    .catch(scanDatabaseError);
  return { photoId, page: inspected.qr.page };
}

export async function correctScanAnswer(
  actor: ScanIdentity,
  id: string,
  input: ScanCorrectionInput,
  db: ScanDatabase,
) {
  const parsed = scanCorrectionInputSchema.parse(input);
  return db
    .transaction(async (tx) => {
      const { row } = await loadScanSubmission(actor, id, tx, true);
      assertScanRevision(row, parsed.revision);
      assertScanEditable(row);
      if (row.state !== "checking")
        throw new ScanAccessError(
          "사진 읽기를 마친 뒤 답을 확인해 주세요.",
          409,
        );
      const evidence = await scanEvidence(tx, id);
      if (
        !evidence.readings.some(
          (r) => r.id === parsed.readId && r.slot_id === parsed.slotId,
        )
      )
        throw new ScanAccessError(
          "현재 사진의 읽은 답이 아닙니다. 최신 상태를 확인해 주세요.",
          409,
        );
      const [sequence] = await tx.query<{ next: number }>(
        `SELECT COALESCE(MAX(sequence),0)+1 AS next FROM concept_blank_scan_correction WHERE submission_id=$1::uuid`,
        [id],
      );
      await tx.query(
        `INSERT INTO concept_blank_scan_correction(id,submission_id,read_id,slot_id,resolution,text,directly_entered,student_actor_id,teacher_actor_id,sequence) VALUES($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,true,$7::uuid,$8::uuid,$9::int)`,
        [
          randomUUID(),
          id,
          parsed.readId,
          parsed.slotId,
          parsed.resolution,
          parsed.text,
          actor.kind === "student" ? actor.id : null,
          actor.kind === "teacher" ? actor.id : null,
          sequence.next,
        ],
      );
      await tx.query(
        `UPDATE concept_blank_scan_submission SET revision=revision+1,last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
        [id],
      );
      return { revision: row.revision + 1 };
    })
    .catch(scanDatabaseError);
}

export async function overrideScanGrade(
  actor: ScanIdentity,
  id: string,
  input: ScanOverrideInput,
  db: ScanDatabase,
) {
  if (actor.kind !== "teacher")
    throw new ScanAccessError("공개 뒤에는 교사만 판정을 고칠 수 있습니다.");
  const parsed = scanOverrideInputSchema.parse(input);
  return db
    .transaction(async (tx) => {
      const { row, issue } = await loadScanSubmission(actor, id, tx, true);
      assertScanRevision(row, parsed.revision);
      if (!scanPublished(row))
        throw new ScanAccessError("공개된 판정만 고칠 수 있습니다.", 409);
      if (
        !issue.snapshot.pages.some((p) =>
          p.targets.some((t) => t.id === parsed.targetId),
        )
      )
        throw new ScanAccessError("이 지면의 판정 대상이 아닙니다.", 400);
      const [previous] = await tx.query<ScanGradeRow>(
        `SELECT * FROM concept_blank_scan_grade WHERE submission_id=$1::uuid AND target_id=$2::text ORDER BY sequence DESC LIMIT 1`,
        [id, parsed.targetId],
      );
      if (!previous)
        throw new ScanAccessError("처음 판정을 확인한 뒤 고쳐 주세요.", 409);
      await tx.query(
        `INSERT INTO concept_blank_scan_grade(id,submission_id,target_id,sequence,label,reason,directly_entered,evidence,origin,teacher_id) VALUES($1::uuid,$2::uuid,$3::text,$4::int,$5::text,$6::text,$7::boolean,$8::jsonb,'teacher',$9::uuid)`,
        [
          randomUUID(),
          id,
          parsed.targetId,
          previous.sequence + 1,
          parsed.label,
          parsed.reason,
          previous.directly_entered,
          JSON.stringify(previous.evidence),
          actor.id,
        ],
      );
      await tx.query(
        `UPDATE concept_blank_scan_submission SET state='teacher-corrected',revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
        [id],
      );
      return { revision: row.revision + 1 };
    })
    .catch(scanDatabaseError);
}
