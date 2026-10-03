import { z } from "zod";

export class TextbookIntegrationError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function integrationRequest<T>(
  url: string,
  schema: z.ZodType<T>,
  options: { signal?: AbortSignal; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: options.signal,
    ...(options.body === undefined
      ? {}
      : {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(options.body),
        }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(payload);
    throw new TextbookIntegrationError(
      response.status,
      parsed.success
        ? parsed.data.error.message
        : "기록을 불러오지 못했습니다. 다시 시도해 주세요.",
    );
  }
  return z.object({ data: schema }).parse(payload).data;
}

export const integrationMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "연결을 확인한 뒤 다시 시도해 주세요.";
