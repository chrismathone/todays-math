/**
 * 오늘의 영어 라우트(`src/app/api/english/**`)가 같이 쓰는 것 — 세션·같은 출처 관문, 영어 전용 거절 응답,
 * 자료 파일 규칙, 시험 요약 읽기 (D-148 · 25 §3).
 *
 * 영어 전용 오류 코드 셋(`PAYLOAD_TOO_LARGE` · `ENGLISH_DRAFT_REJECTED` · `REVISION_MISMATCH`)은 공통 계약
 * `errorCodeSchema` 에 있다(리드 커밋 c70ee7509) — 다른 거절과 같이 `jsonError` 를 지난다.
 */
import {
  ENGLISH_MATERIAL_MAX_BYTES,
  ENGLISH_MATERIAL_MAX_LABEL,
  type EnglishDraftIssue,
} from "@/contracts/english.contract";
import { ENGLISH_SCHEMA_VERSION_V2 } from "@/contracts/englishV2.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import { englishRouteAllowed } from "@/lib/accountRouteAccess";
import { jsonError, unauthorizedError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/session";

import { serializeEnglishExam, type EnglishExamCounts } from "./serialize";
import { ENGLISH_VERSION_MESSAGES, gateEnglishV1Write } from "./v2/versionGate";

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
  if (
    !session.isAdmin &&
    !englishRouteAllowed(
      session.menus ?? [],
      request.method,
      new URL(request.url).pathname,
    )
  )
    return {
      session: null,
      response: jsonError(
        "FORBIDDEN",
        "이 영어 메뉴를 사용할 권한이 없습니다.",
        403,
      ),
    };
  if (options.mutation && !sameOriginMutation(request))
    return {
      session: null,
      response: jsonError("FORBIDDEN", "같은 사이트에서 요청해 주세요.", 403),
    };
  return { session, response: null };
}

// ─────────────────────────────────────────────
// 영어 전용 거절 응답 — 코드는 공통 계약 `errorCodeSchema`(D-148)
// ─────────────────────────────────────────────

export const ENGLISH_ROUTE_MESSAGES = {
  payloadTooLarge: `파일은 ${ENGLISH_MATERIAL_MAX_LABEL} 이하로 올려 주세요.`,
  draftRejected: "문항이 규칙에 맞지 않습니다. 표시된 자리를 고쳐 주세요.",
  revisionMismatch:
    "다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.",
  clientKeyConflict: "같은 저장 키인데 내용이 다릅니다. 새로 저장해 주세요.",
  unsupportedFile: "pdf · docx · txt · png · jpg 파일만 올릴 수 있습니다.",
  emptyFile: "파일이 비어 있습니다.",
  fileFieldMissing: "file 칸에 파일을 넣어 주세요.",
  multipartUnreadable: "올린 파일을 읽지 못했습니다.",
} as const;

/** 413 — 사유는 JSON 으로(파서 오류에 지워지지 않게, 교훈 2026-09-21) */
export const payloadTooLarge = () =>
  jsonError("PAYLOAD_TOO_LARGE", ENGLISH_ROUTE_MESSAGES.payloadTooLarge, 413);

/** 422 — 어느 문항이 어느 규칙에 걸렸는지 `details.issues` 로 */
export const draftRejected = (issues: EnglishDraftIssue[]) =>
  jsonError(
    "ENGLISH_DRAFT_REJECTED",
    ENGLISH_ROUTE_MESSAGES.draftRejected,
    422,
    { issues },
  );

/** 409 — revision CAS 가 어긋났다 */
export const revisionMismatch = () =>
  jsonError("REVISION_MISMATCH", ENGLISH_ROUTE_MESSAGES.revisionMismatch, 409);

/** 409 — 같은 clientKey 인데 저장할 본문이 다르다. 기존 행은 그대로 둔다 */
export const clientKeyConflict = () =>
  jsonError("CONFLICT", ENGLISH_ROUTE_MESSAGES.clientKeyConflict, 409);

// ─────────────────────────────────────────────
// 형식 판 관문 — 세트 저장 라우트(POST · PUT)는 1판 경로다 (자료 개선 M0 · `v2/versionGate.ts`)
// ─────────────────────────────────────────────

export type EnglishV1Body =
  { body: unknown; response: null } | { body: null; response: Response };

/**
 * 요청 본문을 1판 계약에 넘기기 전에 판을 본다. 2판 · 모르는 판 · 2판 칸이 든 본문은 400 으로 사유를 밝혀 거절한다 —
 * 계약의 «모르는 칸» 400 과 같은 코드지만 문구와 `details` 가 «형식 판» 을 짚는다.
 * 지나면 `schemaVersion: 1` 표지만 뗀 본문을 돌려준다. `revision`(CAS)은 여기서 보지 않는다 — 다른 칸이다.
 */
export async function readEnglishV1Body(
  request: Request,
): Promise<EnglishV1Body> {
  const gate = gateEnglishV1Write(await readJson(request));
  if (gate.ok) return { body: gate.body, response: null };
  // 판을 밝힌 요청이면 그 칸을, 판 표지 없이 2판 칸만 든 요청이면 그 칸들의 자리를 짚는다
  const fields =
    gate.reason === "unsupported_version" ||
    gate.schemaVersion === ENGLISH_SCHEMA_VERSION_V2
      ? ["schemaVersion"]
      : gate.markers;
  return {
    body: null,
    response: jsonError(
      "VALIDATION_ERROR",
      gate.message,
      400,
      fields.map((field) => ({ field, message: gate.message })),
    ),
  };
}

/** 409 — 저장된 행이 1판이 아니다. 1판 PUT 으로 덮어쓰면 표적이 든 본문이 사라진다 */
export const storedSetNotV1 = () =>
  jsonError("CONFLICT", ENGLISH_VERSION_MESSAGES.storedNotV1, 409);

// ─────────────────────────────────────────────
// 자료 파일 규칙 (25 §3 — pdf · docx · txt · png · jpg ≤ ENGLISH_MATERIAL_MAX_BYTES, 4MB — Vercel 본문 상한 4.5MB 아래)
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
 * multipart 겉봉(경계 줄 · 칸 머리)의 여유 — `content-length` 로 먼저 자를 때 정확히 상한 크기인 파일이
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

/**
 * UTF-16 단위 상한으로 자르되 **서로게이트 쌍 가운데를 끊지 않는다**(검토 E). 계약의 `max` 는 `.length`(UTF-16 단위)를
 * 세므로 코드포인트 수로 자르면 상한을 넘길 수 있다 — 단위로 자르고, 끝이 높은 서로게이트면 그 한 단위를 뺀다.
 */
export function clampUtf16(text: string, max: number): string {
  const cut = text.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
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
