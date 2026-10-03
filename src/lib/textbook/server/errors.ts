import type { ErrorCode } from "@/contracts/common.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";

/**
 * 교재 서버 코드가 던지는 거절 — 라우트가 `{ error: { code, message, details } }` 로 바꾼다.
 * 화면이 읽는 `details` 의 칸: `serverRevision`(낡은 저장의 지금 값) · `issues`(막는 사유 목록).
 */
export class TextbookError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TextbookError";
  }
}

export const notFound = (what: string) =>
  new TextbookError(404, "NOT_FOUND", `${what}을(를) 찾을 수 없습니다.`);

export const forbidden = (message: string) =>
  new TextbookError(403, "FORBIDDEN", message);

export const invalid = (message: string, issues?: TextbookIssue[]) =>
  new TextbookError(
    400,
    "VALIDATION_ERROR",
    message,
    issues ? { issues } : undefined,
  );

export const conflict = (message: string, details?: Record<string, unknown>) =>
  new TextbookError(409, "CONFLICT", message, details);

/** 낡은 revision 으로 저장했다 — 덮어쓰지 않는다. 지금 값을 같이 준다 */
export const revisionMismatch = (
  what: string,
  serverRevision: number,
  extra?: Record<string, unknown>,
) =>
  new TextbookError(
    409,
    "REVISION_MISMATCH",
    `${what}이(가) 다른 곳에서 바뀌었습니다. 다시 불러온 뒤 저장해 주세요.`,
    { serverRevision, ...extra },
  );

export const notDraft = () =>
  conflict("발행한 판본은 고칠 수 없습니다. 새 판본을 만들어 주세요.");

export const issue = (
  code: string,
  message: string,
  extra: Partial<Omit<TextbookIssue, "code" | "message">> = {},
): TextbookIssue => ({
  code,
  severity: extra.severity ?? "error",
  message,
  path: extra.path ?? [],
  ...(extra.itemId ? { itemId: extra.itemId } : {}),
  ...(extra.sectionId ? { sectionId: extra.sectionId } : {}),
  ...(extra.physicalPageIndex
    ? { physicalPageIndex: extra.physicalPageIndex }
    : {}),
});
