import type { FadingSource, FadingSourceErrorCode } from "@/lib/fading/source";
import { FadingSourceError } from "@/lib/fading/source";

const contracts = () => import("@/contracts/fadingApi.contract");
const FAILED = "처리하지 못했습니다. 다시 시도하세요.";
export const FADING_OFFLINE = "연결되지 않았습니다. 다시 시도하세요.";

async function request<T>(
  url: string,
  parse: (json: unknown) => Promise<T>,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new FadingSourceError("OFFLINE", FADING_OFFLINE, 0);
  }
  if (!res.ok) {
    let message = FAILED;
    let code: FadingSourceErrorCode =
      (
        {
          400: "VALIDATION_ERROR",
          401: "UNAUTHORIZED",
          403: "FORBIDDEN",
          404: "NOT_FOUND",
          409: "CONFLICT",
        } as Record<number, FadingSourceErrorCode>
      )[res.status] ?? "UNKNOWN";
    try {
      const json = (await res.json()) as {
        error?: {
          code?: string;
          message?: string;
          details?: { message?: string }[];
        };
      };
      const first = json.error?.details?.[0]?.message;
      if (res.status === 400 && typeof first === "string") message = first;
      else if (typeof json.error?.message === "string")
        message = json.error.message;
      if (
        [
          "CONFLICT",
          "NOT_FOUND",
          "VALIDATION_ERROR",
          "UNAUTHORIZED",
          "FORBIDDEN",
        ].includes(json.error?.code ?? "")
      )
        code = json.error!.code as FadingSourceErrorCode;
    } catch {
      /* 실패 본문이 없으면 공통 문구. */
    }
    throw new FadingSourceError(code, message, res.status);
  }
  try {
    return await parse(await res.json());
  } catch {
    throw new FadingSourceError("UNKNOWN", FAILED, res.status);
  }
}

export function createApiFadingSource(): FadingSource {
  return {
    state: () =>
      request(
        "/api/learn/fading",
        async (json) =>
          (await contracts()).fadingStateResponseSchema.parse(json).data,
      ),
    act: (action) =>
      request(
        "/api/learn/fading",
        async (json) =>
          (await contracts()).fadingStateResponseSchema.parse(json).data,
        action,
      ),
    catalog: (grade) =>
      request(
        `/api/learn/fading/catalog${grade ? `?grade=${encodeURIComponent(grade)}` : ""}`,
        async (json) =>
          (await contracts()).fadingCatalogResponseSchema.parse(json).data,
      ),
    concept: (id) =>
      request(
        `/api/learn/fading/concepts/${encodeURIComponent(id)}`,
        async (json) =>
          (await contracts()).fadingConceptResponseSchema.parse(json).data,
      ),
  };
}
