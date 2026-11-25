import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  scanNameCaptureInputSchema,
  scanNameCaptureViewSchema,
  type ScanWrittenName,
} from "@/contracts/conceptBlankScanName.contract";
import { scanReadSchema } from "@/contracts/conceptBlankScan.contract";
import { scanRegistrationSchema } from "@/contracts/conceptBlankScanPhoto.contract";
import type { ScanDatabase, ScanSql } from "./database";
import {
  loadScanIssue,
  ScanAccessError,
  scanSubmissionAccess,
  type ScanIdentity,
} from "./issuance";
import { matchWrittenScanName, scanNameCandidates } from "./name";
import { inspectScanPhoto } from "./photo.server";
import { registerScanPhoto } from "./registration";
import { readScanPageWithName, SCAN_READ_PROMPT_VERSION } from "./read";
import { scanConfig, type ScanConfig, type ScanModel } from "./model";
import type { ScanPhotoStorage } from "./storage.server";
import { scanJobFailureMessage } from "./jobs";
import { ScanQueuedError } from "./usage";
import { cancelQueuedScanCalls } from "./usageMaintenance";

const photoSchema = z.object({
  id: z.uuid(),
  bucket: z.string(),
  key: z.string(),
  hash: z.string(),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  width: z.number().int(),
  height: z.number().int(),
  registration: scanRegistrationSchema,
});
type Capture = {
  id: string;
  printed_sheet_id: string;
  teacher_id: string;
  request_id: string;
  photo: unknown;
  readings: unknown;
  read_prompt_version: string | null;
  requested_model: string | null;
  written_name: string | null;
  written_name_status: ScanWrittenName["status"] | null;
  name_match_result: string | null;
  job_id: string | null;
  job_started_at: Date | null;
  job_waiting: boolean;
  last_error: string | null;
  submission_id: string | null;
  created_at: Date;
  expires_at: Date;
  deleted_at: Date | null;
};
export type NameCaptureJob = { id: string; jobId: string };
export type NameCaptureDependencies = {
  db: ScanDatabase;
  storage: ScanPhotoStorage;
  model: (key: string, submissionId?: string, attemptKey?: string) => ScanModel;
  config?: ScanConfig;
  signal?: AbortSignal;
  onError?: (e: unknown) => Promise<void>;
};
async function loadCapture(
  actor: ScanIdentity,
  id: string,
  sql: ScanSql,
  lock = false,
) {
  if (actor.kind !== "teacher")
    throw new ScanAccessError("교사만 이름으로 답안 주인을 찾을 수 있습니다.");
  const [row] = await sql.query<Capture>(
    `SELECT * FROM concept_blank_scan_name_capture WHERE id=$1::uuid${lock ? " FOR UPDATE" : ""}`,
    [z.uuid().parse(id)],
  );
  if (!row || row.teacher_id !== actor.id)
    throw new ScanAccessError("촬영한 이름 기록을 찾을 수 없습니다.", 404);
  const students = await scanNameCandidates(actor, row.printed_sheet_id, sql);
  if (!row.submission_id && (row.deleted_at || row.expires_at <= new Date()))
    throw new ScanAccessError(
      "사진 보관 기간이 지났습니다. 다시 촬영해 주세요.",
      409,
    );
  return { row, students };
}
/** Stage one first-page photo without inventing a student or relaxing the submission FK. */
export async function startScanNameCapture(
  actor: ScanIdentity,
  input: z.infer<typeof scanNameCaptureInputSchema>,
  deps: { db: ScanDatabase; storage: ScanPhotoStorage; origin: string },
) {
  if (actor.kind !== "teacher")
    throw new ScanAccessError("교사만 이름으로 답안 주인을 찾을 수 있습니다.");
  const parsed = scanNameCaptureInputSchema.parse(input);
  await scanNameCandidates(actor, parsed.printedSheetId, deps.db);
  const issue = await loadScanIssue(parsed.printedSheetId, deps.db);
  const image = await inspectScanPhoto(parsed.imageDataUrl, {
    printedSheetId: issue.id,
    pageCount: issue.snapshot.pageCount,
    origin: deps.origin,
  });
  if (image.qr.page !== 1)
    throw new ScanAccessError(
      "이름 칸이 있는 학생지 1쪽을 먼저 찍어 주세요.",
      400,
    );
  const page = issue.layout.pages.find(
    (p) => p.part === "student" && p.number === 1,
  )!;
  const newId = randomUUID(),
    photoId = randomUUID();
  const photo = {
    id: photoId,
    bucket: deps.storage.bucket,
    key: `${issue.userId}/names/${newId}/${photoId}`,
    hash: image.hash,
    mime: image.mime,
    width: image.width,
    height: image.height,
    registration: registerScanPhoto(image.pixels, page, image.geometry),
  };
  const row = await deps.db.transaction(async (tx) => {
    await scanNameCandidates(actor, issue.id, tx);
    await tx.query(
      `INSERT INTO concept_blank_scan_name_capture(id,printed_sheet_id,teacher_id,request_id,photo) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::jsonb) ON CONFLICT(request_id) DO NOTHING`,
      [newId, issue.id, actor.id, parsed.requestId, JSON.stringify(photo)],
    );
    const [stored] = await tx.query<Capture>(
      `SELECT * FROM concept_blank_scan_name_capture WHERE request_id=$1::uuid FOR UPDATE`,
      [parsed.requestId],
    );
    if (
      stored.teacher_id !== actor.id ||
      stored.printed_sheet_id !== issue.id ||
      photoSchema.parse(stored.photo).hash !== photo.hash
    )
      throw new ScanAccessError(
        "같은 요청으로 다른 촬영을 저장할 수 없습니다.",
        409,
      );
    return stored;
  });
  if (row.job_id || row.readings || row.submission_id)
    return { id: row.id, jobId: null };
  await deps.storage.upload(
    photoSchema.parse(row.photo).key,
    image.bytes,
    image.mime,
  );
  return retryScanNameCapture(actor, row.id, deps.db, true);
}
export async function retryScanNameCapture(
  actor: ScanIdentity,
  id: string,
  db: ScanDatabase,
  existingIsOkay = false,
) {
  return db.transaction(async (tx) => {
    const { row } = await loadCapture(actor, id, tx, true);
    if (row.submission_id || row.readings) return { id, jobId: null };
    if (row.job_id && existingIsOkay) return { id, jobId: null };
    if (row.job_id)
      throw new ScanAccessError(
        "이름을 읽고 있습니다. 처리 상태를 확인해 주세요.",
        409,
      );
    const jobId = randomUUID();
    await tx.query(
      `UPDATE concept_blank_scan_name_capture SET job_id=$2::uuid,job_started_at=CURRENT_TIMESTAMP,job_waiting=false,last_error=NULL WHERE id=$1::uuid`,
      [id, jobId],
    );
    return { id, jobId };
  });
}
async function linkCapture(
  actor: ScanIdentity,
  row: Capture,
  studentId: string,
  method: "name-exact" | "teacher-picked",
  tx: ScanSql,
  config?: ScanConfig,
) {
  const { issue, student } = await scanSubmissionAccess(
    actor,
    row.printed_sheet_id,
    studentId,
    tx,
  );
  if (row.submission_id) {
    const [sub] = await tx.query<{ student_id: string }>(
      `SELECT student_id FROM concept_blank_scan_submission WHERE id=$1::uuid`,
      [row.submission_id],
    );
    if (sub.student_id !== studentId)
      throw new ScanAccessError(
        "이미 연결한 답안입니다. 답안 화면에서 바꿔 주세요.",
        409,
      );
    return { id: row.submission_id };
  }
  const photo = photoSchema.parse(row.photo),
    readings = z.array(scanReadSchema).parse(row.readings);
  const result =
    row.written_name_status !== "read"
      ? "none"
      : matchWrittenScanName({ text: row.written_name ?? "", status: "read" }, [
            student,
          ]).result === "matched"
        ? (row.name_match_result ?? "matched")
        : "mismatch";
  await tx.query(
    `INSERT INTO concept_blank_scan_submission(id,printed_sheet_id,student_id,captured_teacher_id,request_id,state,written_name,written_name_status,name_match_result,name_match_method) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::text,$7::text,$8::text,$9::text,$10::text)`,
    [
      row.id,
      issue.id,
      studentId,
      actor.id,
      row.request_id,
      issue.snapshot.pageCount === 1 ? "checking" : "capturing",
      row.written_name,
      row.written_name_status,
      result,
      method,
    ],
  );
  await tx.query(
    `INSERT INTO concept_blank_scan_photo(id,submission_id,page_number,version,is_current,bucket,object_key,content_sha256,mime_type,width,height,registration,created_at,expires_at) VALUES($1::uuid,$2::uuid,1,1,true,$3::text,$4::text,$5::text,$6::text,$7::int,$8::int,$9::jsonb,$10::timestamptz,$11::timestamptz)`,
    [
      photo.id,
      row.id,
      photo.bucket,
      photo.key,
      photo.hash,
      photo.mime,
      photo.width,
      photo.height,
      JSON.stringify(photo.registration),
      row.created_at.toISOString(),
      row.expires_at.toISOString(),
    ],
  );
  for (const reading of readings)
    await tx.query(
      `INSERT INTO concept_blank_scan_read(id,submission_id,photo_id,slot_id,status,text,prompt_version,requested_model) VALUES($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text,$8::text)`,
      [
        randomUUID(),
        row.id,
        photo.id,
        reading.id,
        reading.status,
        reading.text,
        row.read_prompt_version ?? SCAN_READ_PROMPT_VERSION,
        row.requested_model ?? (config ?? scanConfig()).model,
      ],
    );
  await tx.query(
    `UPDATE concept_blank_scan_name_capture SET submission_id=$2::uuid WHERE id=$1::uuid`,
    [row.id, row.id],
  );
  return { id: row.id };
}
export async function chooseScanNameStudent(
  actor: ScanIdentity,
  id: string,
  studentId: string,
  db: ScanDatabase,
) {
  return db.transaction(async (tx) => {
    const { row } = await loadCapture(actor, id, tx, true);
    if (row.job_id || !row.readings)
      throw new ScanAccessError("이름 읽기를 마친 뒤 학생을 골라 주세요.", 409);
    return linkCapture(
      actor,
      row,
      z.uuid().parse(studentId),
      "teacher-picked",
      tx,
    );
  });
}
export async function getScanNameCapture(
  actor: ScanIdentity,
  id: string,
  db: ScanDatabase,
  search = "",
) {
  const { row, students } = await loadCapture(actor, id, db);
  const name = row.written_name_status
    ? { text: row.written_name ?? "", status: row.written_name_status }
    : null;
  const match = name ? matchWrittenScanName(name, students) : null;
  const q = search.trim().slice(0, 100).toLocaleLowerCase();
  const filtered = students
    .filter((s) => `${s.name} ${s.className}`.toLocaleLowerCase().includes(q))
    .map((s) => ({
      id: s.id,
      name: s.name,
      className: s.className,
      candidate: !!match?.candidateIds.includes(s.id),
    }))
    .sort((a, b) => Number(b.candidate) - Number(a.candidate));
  return scanNameCaptureViewSchema.parse({
    id,
    printedSheetId: row.printed_sheet_id,
    submissionId: row.submission_id,
    job: row.job_id ? (row.job_waiting ? "waiting" : "reading") : null,
    lastError: row.last_error,
    writtenName: name,
    result: match?.result ?? null,
    students: filtered.slice(0, 50),
    hasMoreStudents: filtered.length > 50,
  });
}
export async function runScanNameCapture(
  job: NameCaptureJob,
  deps: NameCaptureDependencies,
) {
  const signal = deps.signal ?? AbortSignal.timeout(240_000);
  try {
    const [initial] = await deps.db.query<Capture>(
      `SELECT * FROM concept_blank_scan_name_capture WHERE id=$1::uuid`,
      [job.id],
    );
    if (!initial || initial.job_id !== job.jobId || initial.submission_id)
      return;
    const actor: ScanIdentity = { kind: "teacher", id: initial.teacher_id };
    const { row } = await loadCapture(actor, job.id, deps.db);
    const issue = await loadScanIssue(row.printed_sheet_id, deps.db),
      photo = photoSchema.parse(row.photo);
    if (photo.bucket !== deps.storage.bucket)
      throw new Error("사진 저장소 설정 확인 필요");
    const bytes = await deps.storage.read(photo.key, photo.hash, photo.mime);
    const result = await readScanPageWithName(
      {
        page: issue.snapshot.pages.find((p) => p.number === 1)!,
        imageDataUrl: `data:${photo.mime};base64,${bytes.toString("base64")}`,
        signal,
      },
      deps.model(`name:${job.id}:${photo.id}`, undefined, job.jobId),
    );
    await deps.db.transaction(async (tx) => {
      const { row: current, students } = await loadCapture(
        actor,
        job.id,
        tx,
        true,
      );
      if (current.job_id !== job.jobId) return;
      const name = result.writtenName!,
        match = matchWrittenScanName(name, students);
      const [saved] = await tx.query<Capture>(
        `UPDATE concept_blank_scan_name_capture SET read_prompt_version=$6::text,requested_model=$7::text,readings=$2::jsonb,written_name=$3::text,written_name_status=$4::text,name_match_result=$5::text,job_id=NULL,job_started_at=NULL,job_waiting=false,last_error=NULL WHERE id=$1::uuid RETURNING *`,
        [
          job.id,
          JSON.stringify(result.readings),
          name.text,
          name.status,
          match.result,
          SCAN_READ_PROMPT_VERSION,
          (deps.config ?? scanConfig()).model,
        ],
      );
      if (match.studentId)
        await linkCapture(
          actor,
          saved,
          match.studentId,
          "name-exact",
          tx,
          deps.config,
        );
    });
  } catch (error) {
    const queued =
      error instanceof ScanQueuedError &&
      (
        await deps.db.query(
          `SELECT id FROM concept_blank_scan_usage_call WHERE job_id=$1::uuid AND status='queued'`,
          [job.jobId],
        )
      ).length > 0;
    if (queued) {
      await deps.db.query(
        `UPDATE concept_blank_scan_name_capture SET job_waiting=true WHERE id=$1::uuid AND job_id=$2::uuid`,
        [job.id, job.jobId],
      );
      return;
    }
    await cancelQueuedScanCalls(deps.db, job.jobId);
    await deps.db.query(
      `UPDATE concept_blank_scan_name_capture SET job_id=NULL,job_started_at=NULL,job_waiting=false,last_error=$3::text WHERE id=$1::uuid AND job_id=$2::uuid`,
      [job.id, job.jobId, scanJobFailureMessage(error)],
    );
    await deps.onError?.(error).catch(() => undefined);
  }
}
/** Pending captures have the same seven-day retention; transferred objects belong to the submission photo. */
export async function purgeScanNameCaptures(deps: {
  db: ScanDatabase;
  storage: ScanPhotoStorage;
}) {
  const rows = await deps.db.query<Capture>(
    `SELECT * FROM concept_blank_scan_name_capture WHERE submission_id IS NULL AND deleted_at IS NULL AND expires_at<=CURRENT_TIMESTAMP AND (job_started_at IS NULL OR job_started_at<CURRENT_TIMESTAMP-interval '360 seconds') ORDER BY expires_at LIMIT 50`,
  );
  let deleted = 0;
  for (const candidate of rows) {
    const row = await deps.db.transaction(async (tx) => {
      const [current] = await tx.query<Capture>(
        `SELECT * FROM concept_blank_scan_name_capture WHERE id=$1::uuid FOR UPDATE`,
        [candidate.id],
      );
      return current && !current.submission_id && !current.deleted_at
        ? current
        : null;
    });
    if (!row) continue;
    if (row.job_id) await cancelQueuedScanCalls(deps.db, row.job_id);
    try {
      const photo = photoSchema.parse(row.photo);
      if (photo.bucket !== deps.storage.bucket) continue;
      await deps.storage.remove(photo.key);
      await deps.db.query(
        `UPDATE concept_blank_scan_name_capture SET deleted_at=CURRENT_TIMESTAMP,job_id=NULL,job_started_at=NULL,job_waiting=false WHERE id=$1::uuid`,
        [row.id],
      );
      deleted++;
    } catch {
      /* Keep metadata for next cron's retry; never expose storage errors. */
    }
  }
  return { deleted };
}
