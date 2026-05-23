// A simple token-bucket-ish queue that caps concurrent requests AND enforces
// a minimum spacing between dispatches. Universalis advertises 25 req/sec,
// but in practice we stay comfortably below that to be a good citizen.

type Task<T> = () => Promise<T>;

export class RateLimiter {
  private queue: Array<() => void> = [];
  private inFlight = 0;
  private lastDispatch = 0;

  constructor(
    private readonly maxConcurrent: number = 4,
    private readonly minSpacingMs: number = 80, // ~12 req/s ceiling
  ) {}

  async run<T>(task: Task<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.inFlight < this.maxConcurrent) {
      await this.respectSpacing();
      this.inFlight++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    await this.respectSpacing();
    this.inFlight++;
  }

  private async respectSpacing(): Promise<void> {
    const elapsed = Date.now() - this.lastDispatch;
    if (elapsed < this.minSpacingMs) {
      await sleep(this.minSpacingMs - elapsed);
    }
    this.lastDispatch = Date.now();
  }

  private release(): void {
    this.inFlight--;
    const next = this.queue.shift();
    if (next) next();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
