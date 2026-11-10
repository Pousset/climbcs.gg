import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSampleReplay } from '@cs2/core';
import { testConfig } from '../test/create-test-app';
import { FileReplayStore } from './replay.store';

describe('FileReplayStore', () => {
  let dir: string;
  let store: FileReplayStore;
  const id = '3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cs2-store-'));
    store = new FileReplayStore(testConfig({ storageDir: dir }));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('round-trips a replay', async () => {
    const data = generateSampleReplay();
    await store.save(id, data);
    expect(await store.load(id)).toEqual(data);
  });

  it('compresses the stored file', async () => {
    const data = generateSampleReplay();
    await store.save(id, data);
    const { size } = await stat(join(dir, 'replays', `${id}.json.gz`));
    expect(size).toBeLessThan(JSON.stringify(data).length / 3);
  });

  it('returns null for an unknown replay', async () => {
    expect(await store.load('00000000-0000-4000-8000-000000000000')).toBeNull();
  });

  it('deletes a replay and tolerates deleting twice', async () => {
    await store.save(id, generateSampleReplay());
    await store.delete(id);
    await store.delete(id);
    expect(await store.load(id)).toBeNull();
    expect(await readdir(join(dir, 'replays'))).toEqual([]);
  });

  it('rejects ids that are not UUIDs (path traversal guard)', async () => {
    await expect(store.load('../../etc/passwd')).rejects.toThrow(/Invalid demo id/);
    await expect(store.save('abc', generateSampleReplay())).rejects.toThrow(/Invalid demo id/);
  });
});
