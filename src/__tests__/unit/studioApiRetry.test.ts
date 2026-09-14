// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudioApiError, retryAfterMs } from "@/lib/studio-ai/errors";
import { withModelRetry } from "@/lib/studio-ai/retry";
afterEach(() => vi.useRealTimers());
describe("source retry policy with cancellation", () => {
  it.each([429, 502, 503, 504, 529])(
    "retries transient %i and honors capped retry-after",
    async (status) => {
      vi.useFakeTimers();
      const invoke = vi
        .fn()
        .mockRejectedValueOnce(
          new StudioApiError("temporary", status, true, retryAfterMs("100")),
        )
        .mockResolvedValue("done");
      const pending = withModelRetry(invoke, new AbortController().signal);
      await vi.advanceTimersByTimeAsync(59999);
      expect(invoke).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(await pending).toBe("done");
      expect(invoke).toHaveBeenCalledTimes(2);
    },
  );
  it("uses four retries at 2/4/8/16 seconds and stops", async () => {
    vi.useFakeTimers();
    const invoke = vi
      .fn()
      .mockRejectedValue(new StudioApiError("temporary", 503, true));
    const pending = withModelRetry(invoke, new AbortController().signal).catch(
      (error) => error,
    );
    for (const delay of [2000, 4000, 8000, 16000])
      await vi.advanceTimersByTimeAsync(delay);
    expect(await pending).toBeInstanceOf(StudioApiError);
    expect(invoke).toHaveBeenCalledTimes(5);
  });
  it("does not retry auth, parsing, or token exhaustion errors and aborts backoff", async () => {
    vi.useFakeTimers();
    for (const error of [
      new StudioApiError("auth", 401),
      new StudioApiError("permission", 403),
      new StudioApiError("tokens"),
      new SyntaxError("parse"),
    ]) {
      const invoke = vi.fn().mockRejectedValue(error);
      await expect(
        withModelRetry(invoke, new AbortController().signal),
      ).rejects.toBe(error);
      expect(invoke).toHaveBeenCalledTimes(1);
    }
    const controller = new AbortController();
    const invoke = vi
      .fn()
      .mockRejectedValue(new StudioApiError("temporary", 429, true));
    const pending = withModelRetry(invoke, controller.signal).catch(
      (error) => error,
    );
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    expect(await pending).toBe(controller.signal.reason);
    await vi.advanceTimersByTimeAsync(60000);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
