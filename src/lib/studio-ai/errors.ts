/** Only safe status and retry metadata cross the provider boundary. */
export class StudioApiError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly retryable = false,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}
export function retryAfterMs(value: string | null | undefined) {
  const seconds = Number.parseFloat(value ?? "");
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(60000, Math.ceil(seconds * 1000))
    : undefined;
}
