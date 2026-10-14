/**
 * 오늘의 영어 화면 공용 — 요청 · 오류 문구 · 고른 시험 기억 · 표기 (D-148).
 *
 * 화면은 서버의 오류 문구(`{ error: { message } }`)를 그대로 올린다 — 이유를 지어내지 않는다(ConceptView 결).
 * 판정은 상태 코드로 한다(409 충돌 · 404 없음) — 오류 코드 글자(REVISION_MISMATCH/CONFLICT)에 기대지 않는다.
 */
import {
  ENGLISH_MATERIAL_MAX_LABEL,
  type EnglishDraftIssue,
  type EnglishExam,
  type EnglishSetSource,
  type EnglishSetStatus,
} from "@/contracts/english.contract";

export type Load<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

export const ENGLISH_LOAD_ERROR =
  "오늘 영어 자료를 불러오지 못했습니다. 다시 시도해 주세요.";

export class EnglishRequestError extends Error {
  status: number;
  /** 검증기 거절(422 ENGLISH_DRAFT_REJECTED)의 `details.issues` — 어느 문항·어느 규칙인지 */
  issues: EnglishDraftIssue[] | null;
  constructor(
    message: string,
    status: number,
    issues: EnglishDraftIssue[] | null = null,
  ) {
    super(message);
    this.name = "EnglishRequestError";
    this.status = status;
    this.issues = issues;
  }
}

/** 검증기 이슈 목록을 한 줄씩 — «N번 문항: …» */
export const formatIssues = (issues: EnglishDraftIssue[]) =>
  issues
    .map((issue) =>
      issue.question === null
        ? issue.message
        : `${issue.question + 1}번 문항: ${issue.message}`,
    )
    .join(" ");

const isIssueList = (value: unknown): value is EnglishDraftIssue[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as { message?: unknown }).message === "string" &&
      ((item as { question?: unknown }).question === null ||
        typeof (item as { question?: unknown }).question === "number"),
  );

export const messageOf = (error: unknown, fallback = ENGLISH_LOAD_ERROR) =>
  error instanceof Error && error.message ? error.message : fallback;

export const statusOf = (error: unknown) =>
  error instanceof EnglishRequestError ? error.status : null;

/** JSON 요청 하나 — 실패면 서버 문구와 상태 코드를 실은 `EnglishRequestError` */
export async function requestEnglish(
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", ...init });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* 본문 없는 응답(413 등) — 아래에서 상태 코드로 판단한다 */
  }
  if (!response.ok) {
    const error = (
      body as {
        error?: { message?: unknown; details?: { issues?: unknown } };
      } | null
    )?.error;
    const message = error?.message;
    const issues = error?.details?.issues;
    throw new EnglishRequestError(
      typeof message === "string" && message ? message : ENGLISH_LOAD_ERROR,
      response.status,
      isIssueList(issues) ? issues : null,
    );
  }
  return body;
}

export const jsonInit = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

// ─────────────────────────────────────────────
// 고른 시험 기억 — localStorage (없어도 화면은 돈다)
// ─────────────────────────────────────────────

export const EXAM_STORAGE_KEY = "today-english-exam";

export function readStoredExam(): string | null {
  try {
    return localStorage.getItem(EXAM_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeExam(id: string | null) {
  try {
    if (id) localStorage.setItem(EXAM_STORAGE_KEY, id);
    else localStorage.removeItem(EXAM_STORAGE_KEY);
  } catch {
    /* 저장 공간이 막혀도 고르기는 된다 */
  }
}

// ─────────────────────────────────────────────
// 표기
// ─────────────────────────────────────────────

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const formatChars = (length: number) =>
  `${length.toLocaleString("ko-KR")}자`;

/** «9월 30일» — ISO 날짜시간에서 */
export function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** 시험 날짜(YYYY-MM-DD) → «10월 14일 시험 예정» · 없으면 «시험 날짜 미정». Date 를 안 거쳐 시간대에 안 흔들린다 */
export function formatExamDate(value: string | null): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "시험 날짜 미정";
  return `${Number(match[2])}월 ${Number(match[3])}일 시험 예정`;
}

export const examLabel = (exam: Pick<EnglishExam, "grade" | "title">) =>
  `${exam.grade} · ${exam.title}`;

export const SOURCE_LABEL: Record<EnglishSetSource, string> = {
  chatgpt: "ChatGPT 초안",
  cloze: "원문 복원",
  deepseek: "AI 생성",
  manual: "직접 작성",
};

/** 상태 알약의 색 갈래 — 오늘의 개념 결(초안 호박 · 검토 중 회색 · 검토 완료 코발트 옅은 면) */
export const STATUS_TONE: Record<
  EnglishSetStatus,
  "draft" | "review" | "done"
> = {
  초안: "draft",
  "검토 중": "review",
  "검토 완료": "done",
};

export const MATERIAL_ACCEPT = ".pdf,.docx,.txt,.png,.jpg,.jpeg";
export const MATERIAL_FILE_PATTERN = /\.(pdf|docx|txt|png|jpe?g)$/i;
/** 상한 문구는 계약 상수 하나에서 — 4MB(Vercel 본문 상한 4.5MB, 2de827cc3) */
export const MATERIAL_TOO_LARGE = `${ENGLISH_MATERIAL_MAX_LABEL} 이하의 파일만 올릴 수 있습니다.`;
export const MATERIAL_BAD_TYPE =
  "pdf · docx · txt · png · jpg 파일만 올릴 수 있습니다.";
/** 글을 읽을 수 있는 자료 — 사진뿐이다(D-158 · 서버 `ENGLISH_READABLE_MIME` 와 같은 범위) */
export const PHOTO_ACCEPT = ".png,.jpg,.jpeg";
export const PHOTO_FILE_PATTERN = /\.(png|jpe?g)$/i;
export const PHOTO_BAD_TYPE = "png · jpg 사진만 읽을 수 있습니다.";
export const isEnglishPhoto = (material: {
  mimeType: string;
  hasFile: boolean;
}) => material.hasFile && /^image\/(png|jpeg)$/.test(material.mimeType);
