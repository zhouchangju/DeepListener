/**
 * Process-wide concurrency limiter for ffmpeg subprocesses.
 *
 * Export routes spawn ffmpeg per segment/track via Promise.all batches. With
 * two concurrent export requests the process can balloon to 100+ ffmpeg
 * children and exhaust file descriptors / CPU on a single-user machine. This
 * shared semaphore caps the total number of concurrently-running ffmpeg jobs
 * across ALL requests so we stay within a sane budget.
 *
 * The limit is intentionally modest: ffmpeg is CPU/IO heavy and the export
 * routes already batch their work, so a small global cap keeps latency
 * bounded without starving other requests.
 */

const DEFAULT_MAX_CONCURRENT = Number(process.env.FFMPEG_MAX_CONCURRENT) || 6;

interface QueueEntry {
  resolve: () => void;
}

class FfmpegLimiter {
  private active = 0;
  private readonly max: number;
  private readonly queue: QueueEntry[] = [];

  constructor(max = DEFAULT_MAX_CONCURRENT) {
    this.max = max;
  }

  /**
   * Acquire a slot. Resolves when a concurrent-ffmpeg slot is available.
   * Always pair with {@link release} in a finally block.
   */
  acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      // Hand the slot directly to the next waiter (active stays the same).
      next.resolve();
      return;
    }
    this.active = Math.max(0, this.active - 1);
  }

  /** For tests / diagnostics. */
  get activeCount(): number {
    return this.active;
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}

/**
 * Run `fn` under the global ffmpeg concurrency limit. `fn` is expected to
 * spawn exactly one ffmpeg process.
 */
export async function withFfmpegLimit<T>(fn: () => Promise<T>): Promise<T> {
  await globalFfmpegLimiter.acquire();
  try {
    return await fn();
  } finally {
    globalFfmpegLimiter.release();
  }
}

export const globalFfmpegLimiter = new FfmpegLimiter();
