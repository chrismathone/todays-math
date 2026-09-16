/**
 * 서버가 준 오류 문구를 **그대로** 글자로 — 상태 코드(400/422)로 가르지 않는다
 * (22 §4 리드 결정 F · 화면 트랙 브리프 §0).
 *
 * 응답 모양은 `errorResponseSchema` — `{ error: { code, message, details? } }`.
 * `details` 가 `[{ field, message }]` 이면 칸 문구를 뒤에 잇는다(본 문구와 같은 것은 한 번만).
 */
export class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}

export function serverErrorText(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const error = (body as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const { message, details } = error as {
    message?: unknown;
    details?: unknown;
  };
  if (typeof message !== "string" || !message) return null;
  const extra = Array.isArray(details)
    ? [
        ...new Set(
          details
            .map((d) =>
              d && typeof d === "object"
                ? (d as { message?: unknown }).message
                : null,
            )
            .filter((m): m is string => typeof m === "string" && m !== message),
        ),
      ]
    : [];
  return extra.length ? `${message} ${extra.join(" · ")}` : message;
}

/** 응답이 실패면 서버 문구로 `ServerError` 를 던진다. 본문이 없으면 `fallback`. */
export async function throwServerError(
  res: Response,
  fallback: string,
): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new ServerError(serverErrorText(body) ?? fallback);
}
