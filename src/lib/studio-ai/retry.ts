import { StudioApiError } from "./errors";

function pause(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
/** Source withRetry defaults: four retries, 2/4/8/16 seconds, Retry-After capped at 60s. */
export async function withModelRetry<T>(
  invoke: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      return await invoke();
    } catch (error) {
      signal.throwIfAborted();
      if (
        !(error instanceof StudioApiError) ||
        !error.retryable ||
        attempt >= 4
      )
        throw error;
      await pause(error.retryAfterMs ?? 2000 * 2 ** attempt, signal);
    }
  }
}
