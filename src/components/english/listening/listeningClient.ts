export const LISTENING_API = "/api/english/listening";

export class ListeningRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ListeningRequestError";
  }
}

export async function listeningRequest<T>(
  path: string,
  signal: AbortSignal,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${LISTENING_API}${path}`, {
    method,
    signal,
    credentials: "same-origin",
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  return readListeningResponse<T>(response);
}

export async function readListeningResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.error) {
    throw new ListeningRequestError(
      typeof result?.error?.message === "string"
        ? result.error.message
        : "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
      response.status,
      typeof result?.error?.code === "string"
        ? result.error.code
        : "request_failed",
    );
  }
  if (!result || !("data" in result)) {
    throw new ListeningRequestError(
      "서버 응답을 확인하지 못했습니다. 다시 불러와 주세요.",
      response.status,
      "invalid_response",
    );
  }
  return result.data as T;
}

export function listeningError(error: unknown): string {
  if (error instanceof ListeningRequestError && error.status === 409) {
    return "다른 작업에서 자료가 변경되었습니다. 입력은 보존했습니다. 최신 저장본을 확인한 뒤 다시 수정해 주세요.";
  }
  return error instanceof ListeningRequestError
    ? error.message
    : "서버에 연결하지 못했습니다. 입력은 보존했습니다. 다시 시도해 주세요.";
}
