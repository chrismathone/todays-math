interface PendingJob {
  signal: AbortSignal;
  run: () => Promise<void>;
  resolve: () => void;
  reject: (reason: unknown) => void;
  abort: () => void;
}

/** FIFO slots cover rendering as well as requests, including crop batches. */
export class StudioAiQueue {
  private running = 0;
  private pending: PendingJob[] = [];

  constructor(private readonly concurrency = 2) {}

  /**
   * `first` — 기다리는 일들의 **맨 앞**에 세운다. 원장님이 편집기에서 직접 누른 요청(«다시 그리기»·«요청대로 고치기»)이
   * 일괄 생성 스무 개 뒤에 서지 않게. 돌고 있는 일은 안 밀어낸다 — 동시 요청 수(서버의 계정당 한도)는 그대로다.
   */
  enqueue(
    signal: AbortSignal,
    run: () => Promise<void>,
    first = false,
  ): Promise<void> {
    if (signal.aborted) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const job: PendingJob = {
        signal,
        run,
        resolve,
        reject,
        abort: () => {
          this.pending = this.pending.filter((item) => item !== job);
          // Cancellation settles the caller even if external I/O ignores abort.
          // An active slot stays occupied until that I/O actually settles.
          resolve();
        },
      };
      signal.addEventListener("abort", job.abort, { once: true });
      if (first) this.pending.unshift(job);
      else this.pending.push(job);
      this.drain();
    });
  }

  private drain() {
    while (this.running < this.concurrency && this.pending.length) {
      const job = this.pending.shift()!;
      this.running++;
      void this.execute(job);
    }
  }

  private async execute(job: PendingJob) {
    try {
      if (!job.signal.aborted) await job.run();
      job.resolve();
    } catch (error) {
      job.reject(error);
    } finally {
      job.signal.removeEventListener("abort", job.abort);
      this.running--;
      this.drain();
    }
  }
}
