/**
 * 오류 기록에 싣는 «설명» 조각 — 깊은 곳이 `noteErrorLog` 로 남길 때 쓴다.
 *
 * 원칙: **어느 칸이 왜**는 싣고, **값**은 싣지 않는다(요청 본문 전체는 안 싣는다 — 브리프 §3.2).
 * 모델 응답(앞부분)은 싣는다 — 모델이 무엇을 냈는지가 패치의 재료다(비밀 값은 기록기가 거른다).
 */
import { ZodError } from "zod";

/** zod 이슈 → `경로: 문구 (code)` 한 줄씩. 값은 안 싣는다(zod 4 문구는 기대한 형·받은 형만 말한다). */
export function zodIssueDetail(error: ZodError, max = 20): string {
  const lines = error.issues.slice(0, max).map((issue) => {
    const where = issue.path.map(String).join(".") || "(root)";
    const extra =
      "expected" in issue && issue.expected
        ? ` · 기대 ${String(issue.expected)}`
        : "";
    return `${where}: ${issue.message} (${issue.code}${extra})`;
  });
  if (error.issues.length > max)
    lines.push(`… 외 ${error.issues.length - max}건`);
  return lines.join("\n");
}

/** 요청을 못 받아들인 까닭 — zod · JSON · 그 밖. */
export function badRequestDetail(error: unknown): string {
  if (error instanceof ZodError) return zodIssueDetail(error);
  if (error instanceof SyntaxError)
    return `JSON 을 읽지 못함 — ${error.message.slice(0, 200)}`;
  if (error instanceof Error)
    return `${error.name}: ${error.message.slice(0, 300)}`;
  return String(error).slice(0, 300);
}

const kindOf = (value: unknown) =>
  value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
const sizeOf = (value: unknown): number | undefined => {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return undefined;
};

/**
 * 요청 본문의 **모양** — 맨 위 열쇠·형·크기(글자 수/원소 수)만. 값은 `action`·`provider`·`grade` 처럼
 * 고른 값(열거형) 몇 개만 싣는다.
 */
export function bodyShape(
  raw: unknown,
  enumKeys: readonly string[] = ["action", "provider", "grade", "model"],
): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { type: kindOf(raw) };
  const entries = Object.entries(raw as Record<string, unknown>);
  const shape: Record<string, unknown> = {
    keys: entries.map(([key]) => key).slice(0, 40),
    types: Object.fromEntries(
      entries.slice(0, 40).map(([key, value]) => [key, kindOf(value)]),
    ),
    sizes: Object.fromEntries(
      entries.slice(0, 40).flatMap(([key, value]) => {
        const size = sizeOf(value);
        return size === undefined ? [] : [[key, size]];
      }),
    ),
  };
  for (const key of enumKeys) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length <= 60) shape[key] = value;
  }
  return shape;
}

/** data URL 의 바이트 수(어림) — 이미지를 싣지 않고 크기만 적을 때. */
export function dataUrlBytes(dataUrl: string | undefined): number | undefined {
  if (!dataUrl) return undefined;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return undefined;
  const base64 = dataUrl.slice(comma + 1).replace(/=+$/, "");
  return Math.floor((base64.length * 3) / 4);
}

/** 글의 앞부분 — 잘랐으면 원래 길이를 같이. */
export function textHead(
  text: string,
  max = 4000,
): { head: string; length: number } {
  return { head: text.slice(0, max), length: text.length };
}

/** 던진 오류를 개발자용 한 덩어리로 — 이름·문구·(있으면) 엔진 원문·진단·상태·스택. */
export function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return String(error).slice(0, 1000);
  const parts = [`${error.name}: ${error.message}`];
  const extra = error as Error & {
    detail?: unknown;
    diagnostic?: unknown;
    status?: unknown;
    retryable?: unknown;
  };
  if (typeof extra.detail === "string" && extra.detail)
    parts.push(`[detail] ${extra.detail}`);
  if (typeof extra.diagnostic === "string" && extra.diagnostic)
    parts.push(`[diagnostic] ${extra.diagnostic}`);
  if (typeof extra.status === "number")
    parts.push(
      `[status] ${extra.status}${extra.retryable === true ? " (재시도 가능)" : ""}`,
    );
  if (error.stack) parts.push(error.stack.split("\n").slice(1, 12).join("\n"));
  return parts.join("\n");
}
