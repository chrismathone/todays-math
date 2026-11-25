import "server-only";

export class ScanPaperError extends Error {
  readonly status = 503;
  constructor(message: string) {
    super(message);
    this.name = "ScanPaperError";
  }
}

/** One Chromium per process. Waiters expire without ever launching a browser.
 * The work must honour its remaining signal and close its browser before returning. */
export function createScanRenderQueue() {
  let active = false;
  const waiters: (() => void)[] = [];
  return async function queued<T>(
    work: (signal: AbortSignal) => Promise<T>,
    budgetMs = 90_000,
  ): Promise<T> {
    const deadline = Date.now() + budgetMs;
    await new Promise<void>((resolve, reject) => {
      const enter = () => {
        clearTimeout(timer);
        active = true;
        resolve();
      };
      const timer = setTimeout(() => {
        const i = waiters.indexOf(enter);
        if (i >= 0) waiters.splice(i, 1);
        reject(
          new ScanPaperError(
            "지면 발행 대기 시간이 지났습니다. 잠시 뒤 다시 발행해 주세요.",
          ),
        );
      }, budgetMs);
      if (active) waiters.push(enter);
      else enter();
    });
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        controller.abort(
          new ScanPaperError(
            "지면 발행 제한 시간이 지났습니다. 다시 발행해 주세요.",
          ),
        ),
      Math.max(0, deadline - Date.now()),
    );
    let rejectDeadline!: (reason: unknown) => void;
    const deadlineResult = new Promise<never>((_, reject) => {
      rejectDeadline = reject;
    });
    const abort = () => rejectDeadline(controller.signal.reason);
    controller.signal.addEventListener("abort", abort, { once: true });
    const result = Promise.resolve().then(() => work(controller.signal));
    const release = () => {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", abort);
      active = false;
      waiters.shift()?.();
    };
    // A browser launch/close may finish late. Reply by the deadline, but do not
    // start another Chromium until that operation has completed its cleanup.
    void result.then(release, release);
    return Promise.race([result, deadlineResult]);
  };
}
