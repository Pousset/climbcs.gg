import { KeyedMutex } from './keyed-mutex';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('KeyedMutex', () => {
  it('runs tasks of the same key strictly one after the other', async () => {
    const mutex = new KeyedMutex();
    const log: string[] = [];
    const task = (name: string, ms: number) => async () => {
      log.push(`start ${name}`);
      await sleep(ms);
      log.push(`end ${name}`);
    };
    await Promise.all([
      mutex.run('u1', task('a', 20)),
      mutex.run('u1', task('b', 1)),
      mutex.run('u1', task('c', 1)),
    ]);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('lets different keys run concurrently', async () => {
    const mutex = new KeyedMutex();
    const log: string[] = [];
    await Promise.all([
      mutex.run('u1', async () => {
        log.push('start 1');
        await sleep(20);
        log.push('end 1');
      }),
      mutex.run('u2', async () => {
        log.push('start 2');
        await sleep(1);
        log.push('end 2');
      }),
    ]);
    expect(log).toEqual(['start 1', 'start 2', 'end 2', 'end 1']);
  });

  it('returns the value of the task', async () => {
    await expect(new KeyedMutex().run('k', async () => 42)).resolves.toBe(42);
  });

  it('propagates a failure without blocking the queue', async () => {
    const mutex = new KeyedMutex();
    const failing = mutex.run('k', async () => {
      throw new Error('boom');
    });
    const next = mutex.run('k', async () => 'ok');
    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });

  it('forgets keys once their queue is drained', async () => {
    const mutex = new KeyedMutex();
    await mutex.run('a', async () => undefined);
    await mutex.run('b', async () => undefined);
    expect(mutex.activeKeys).toBe(0);
  });
});
