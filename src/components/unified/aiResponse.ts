import { reportClientError, serverLogged } from "@/lib/errorLog/clientReporter";
import { STUDIO_AI_TOO_LARGE } from "@/lib/studio-ai/limits";

/**
 * AI 경로의 응답을 읽는다 — **JSON 이 아닐 수 있다**(트랙 39, 2026-09-21).
 * 플랫폼(Vercel)이 먼저 자른 413·504, 게이트웨이의 502 HTML, 로그인 화면 따위는 우리 서버를 안 거쳐
 * 평문·HTML 로 온다. 그걸 `response.json()` 으로 읽어 «Unexpected token 'R', "Request En"... is not
 * valid JSON» 이 원장님 화면에 그대로 나왔다. 본문은 글자로 받고, JSON 으로 풀리는 때만 쓴다.
 */
export const AI_RESPONSE_UNREADABLE =
  "AI 응답을 읽지 못했습니다. 다시 시도해 주세요.";

export function aiFailureMessage(status: number, body?: unknown) {
  if (status === 413) return STUDIO_AI_TOO_LARGE;
  const error =
    body && typeof body === "object" && "error" in body
      ? (body as { error?: unknown }).error
      : undefined;
  if (typeof error === "string" && error.trim()) return error;
  if (status === 408 || status === 504)
    return "AI 작업 시간이 초과되었습니다. 다시 시도해 주세요.";
  if (status === 401 || status === 403)
    return "접근 권한을 확인하지 못했습니다. 다시 로그인해 주세요.";
  if (status === 429) return "요청이 많습니다. 잠시 뒤 다시 시도해 주세요.";
  if (status >= 500)
    return `AI 서버가 응답하지 않았습니다(${status}). 잠시 뒤 다시 시도해 주세요.`;
  return `AI 요청이 실패했습니다(${status}). 다시 시도해 주세요.`;
}

/**
 * 실패한 AI 요청 — `message` 는 화면에 나가는 사람 문구, `detail` 은 서버가 따로 실어 보낸 개발자용 원문
 * (도형 엔진 검증 사유 등, 트랙 45 2026-09-21). detail 은 화면 한 줄에 넣지 않고 마우스 올림·콘솔로만 쓴다.
 */
export class AiRequestError extends Error {
  readonly detail?: string;
  constructor(message: string, detail?: string) {
    super(message);
    this.name = "AiRequestError";
    if (detail) this.detail = detail;
  }
}

function aiFailureDetail(body: unknown) {
  const detail =
    body && typeof body === "object" && "detail" in body
      ? (body as { detail?: unknown }).detail
      : undefined;
  return typeof detail === "string" && detail.trim()
    ? detail.slice(0, 500)
    : undefined;
}

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
};

/**
 * 성공이면 JSON 객체를, 아니면 사람 문구의 Error 를 던진다. 파서 오류는 밖으로 안 나간다.
 *
 * 실패는 오류 기록으로도 보낸다(원장님 2026-09-22) — **서버가 기록하지 못한 것만**: 플랫폼이 먼저 자른 413·504,
 * 게이트웨이 HTML, 로그인 화면이 온 200. 서버가 기록했으면 응답에 기록 번호 머리가 있다. 화면 문구는 그대로다.
 */
export async function readAiJson(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  let body: unknown;
  if (/^\s*[{[]/.test(text))
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  if (!response.ok) {
    const message = aiFailureMessage(response.status, body);
    if (!serverLogged(response))
      reportClientError({
        kind: "client-request-failed",
        message,
        detail: text.slice(0, 500) || undefined,
        request: { path: pathOf(response.url), status: response.status },
      });
    throw new AiRequestError(message, aiFailureDetail(body));
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    reportClientError({
      kind: "client-request-failed",
      message: AI_RESPONSE_UNREADABLE,
      detail: text.slice(0, 500) || undefined,
      request: { path: pathOf(response.url), status: response.status },
    });
    throw new Error(AI_RESPONSE_UNREADABLE);
  }
  return body as Record<string, unknown>;
}
