/**
 * 오늘의 영어 라우트(`src/app/api/english/**`)가 같이 쓰는 것 — 세션·같은 출처 관문, 영어 전용 거절 응답,
 * 자료 파일 규칙, 시험 요약 읽기 (D-148 · 25 §3).
 *
 * 🔴 영어 전용 오류 코드(`PAYLOAD_TOO_LARGE` · `ENGLISH_DRAFT_REJECTED` · `REVISION_MISMATCH`)는 공통 계약의
 *    `errorCodeSchema` 에 아직 없다(리드 소유 — 보고서 «리드가 정할 것»). 그래서 `jsonError` 를 지나지 못하고
 *    같은 `{ error: { code, message, details? } }` 모양을 직접 만든다. 계약에 코드가 들어오면 `jsonError` 로 바꾼다.
 */
import { NextResponse } from "next/server";

import {
  ENGLISH_MATERIAL_MAX_BYTES,
  type EnglishDraftIssue,
} from "@/contracts/english.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import { jsonError, unauthorizedError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/session";

import { serializeEnglishExam, type EnglishExamCounts } from "./serialize";

// ─────────────────────────────────────────────
// 관문 — 세션 401 · 쓰기는 같은 출처(`authorizeAccount` 결)
// ─────────────────────────────────────────────

export type EnglishGate =
  | { session: SessionUser; response: null }
  | { session: null; response: Response };

export async function requireEnglishSession(
  request: Request,
  options: { mutation?: boolean } = {},
): Promise<EnglishGate> {
  const session = await getSessionUser();
  if (!session) return { session: null, response: unauthorizedError() };
  if (options.mutation && !sameOriginMutation(request))
    return {
      session: null,
      response: jsonError("FORBIDDEN", "같은 사이트에서 요청해 주세요.", 403),
    };
  return { session, response: null };
}

// ─────────────────────────────────────────────
// 영어 전용 거절 응답
// ─────────────────────────────────────────────

export const ENGLISH_ROUTE_MESSAGES = {
  payloadTooLarge: "파일은 10MB 이하로 올려 주세요.",
  draftRejected: "문항이 규칙에 맞지 않습니다. 표시된 자리를 고쳐 주세요.",
  revisionMismatch:
    "다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.",
  unsupportedFile: "pdf · docx · txt · png · jpg 파일만 올릴 수 있습니다.",
  emptyFile: "파일이 비어 있습니다.",
  fileFieldMissing: "file 칸에 파일을 넣어 주세요.",
  multipartUnreadable: "올린 파일을 읽지 못했습니다.",
} as const;

export type EnglishErrorCode =
  "PAYLOAD_TOO_LARGE" | "ENGLISH_DRAFT_REJECTED" | "REVISION_MISMATCH";

/** `{ error: { code, message, details? } }` — `jsonError` 와 같은 모양(공통 계약에 코드가 없어 직접 만든다) */
export function englishError(
  code: EnglishErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

/** 413 — 사유는 JSON 으로(파서 오류에 지워지지 않게, 교훈 2026-09-21) */
export const payloadTooLarge = () =>
  englishError(
    "PAYLOAD_TOO_LARGE",
    ENGLISH_ROUTE_MESSAGES.payloadTooLarge,
    413,
  );

/** 422 — 어느 문항이 어느 규칙에 걸렸는지 `details.issues` 로 */
export const draftRejected = (issues: EnglishDraftIssue[]) =>
  englishError(
    "ENGLISH_DRAFT_REJECTED",
    ENGLISH_ROUTE_MESSAGES.draftRejected,
    422,
    { issues },
  );

/** 409 — revision CAS 가 어긋났다 */
export const revisionMismatch = () =>
  englishError(
    "REVISION_MISMATCH",
    ENGLISH_ROUTE_MESSAGES.revisionMismatch,
    409,
  );

// ─────────────────────────────────────────────
// 자료 파일 규칙 (25 §3 — pdf · docx · txt · png · jpg ≤ 10MB)
// ─────────────────────────────────────────────

/** 이름 확장자 → 저장할 MIME(브라우저가 보낸 형은 믿지 않는다) */
export const ENGLISH_MATERIAL_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** 파일 이름의 확장자(소문자) — 허용 목록 밖이면 null */
export function englishMaterialExtension(name: string): string | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  const ext = match?.[1]?.toLowerCase();
  return ext && ext in ENGLISH_MATERIAL_MIME_BY_EXTENSION ? ext : null;
}

/**
 * multipart 겉봉(경계 줄 · 칸 머리)의 여유 — `content-length` 로 먼저 자를 때 정확히 10MB 인 파일이
 * 겉봉 몇백 바이트 때문에 거절되지 않게. 실제 크기는 받은 뒤 `file.size` 로 다시 잰다.
 */
export const ENGLISH_MULTIPART_ALLOWANCE = 64 * 1024;

/** 본문을 읽기 **전에** `content-length` 로 자른다 — 머리가 없으면 통과(받은 뒤 잰다) */
export function contentLengthExceeds(request: Request): boolean {
  const raw = request.headers.get("content-length");
  if (raw === null) return false;
  const length = Number(raw);
  return (
    Number.isFinite(length) &&
    length > ENGLISH_MATERIAL_MAX_BYTES + ENGLISH_MULTIPART_ALLOWANCE
  );
}

/** `Content-Disposition: attachment` — 아스키 대체 이름과 RFC 5987 UTF-8 이름을 같이 */
export function attachmentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(name).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

// ─────────────────────────────────────────────
// 시험 요약 읽기 — 자료 수 · 세트 수 · 검토 완료 수
// ─────────────────────────────────────────────

type ExamWhere = Parameters<typeof db.englishExam.findMany>[0] extends
  { where?: infer W } | undefined
  ? W
  : never;

const EXAM_COUNTS = {
  _count: { select: { materials: true, sets: true } },
} as const;

async function reviewedCounts(examIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!examIds.length) return map;
  const reviewed = await db.englishQuestionSet.findMany({
    where: { examId: { in: examIds }, status: "검토 완료" },
    select: { examId: true },
  });
  for (const { examId } of reviewed)
    map.set(examId, (map.get(examId) ?? 0) + 1);
  return map;
}

/** 내 범위의 시험 목록 — 새로 만든 것이 먼저(`createdAt` 내림차순) */
export async function loadEnglishExams(where: ExamWhere) {
  const rows = await db.englishExam.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: EXAM_COUNTS,
  });
  const reviewed = await reviewedCounts(rows.map((row) => row.id));
  return rows.map((row) =>
    serializeEnglishExam(row, {
      materials: row._count.materials,
      sets: row._count.sets,
      reviewed: reviewed.get(row.id) ?? 0,
    }),
  );
}

/** 시험 하나 + 요약 — 고친 뒤 응답에 쓴다(없으면 null) */
export async function loadEnglishExam(id: string) {
  const row = await db.englishExam.findUnique({
    where: { id },
    include: EXAM_COUNTS,
  });
  if (!row) return null;
  const reviewed = await reviewedCounts([row.id]);
  const counts: EnglishExamCounts = {
    materials: row._count.materials,
    sets: row._count.sets,
    reviewed: reviewed.get(row.id) ?? 0,
  };
  return serializeEnglishExam(row, counts);
}

/** 요청 본문 JSON — 못 읽으면 undefined(계약 parse 가 400 으로 바꾼다) */
export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => undefined);
}
