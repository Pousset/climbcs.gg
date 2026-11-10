/**
 * Runs async tasks one at a time per key (e.g. per user) while letting different keys run in
 * parallel. In-process only: with several API instances, use a database or advisory lock instead.
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  /** Number of keys with a task currently running or queued. */
  get activeKeys(): number {
    return this.tails.size;
  }

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const result = previous.then(task);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(key, tail);
    try {
      return await result;
    } finally {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}
