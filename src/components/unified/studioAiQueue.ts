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

  enqueue(signal: AbortSignal, run: () => Promise<void>): Promise<void> {
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
      this.pending.push(job);
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
