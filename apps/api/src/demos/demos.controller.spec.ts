import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { generateSampleReplay, SAMPLE_PLAYER_ID } from '@cs2/core';
import { createTestApp } from '../test/create-test-app';
import { CS2_DEMO_MAGIC } from './demo-upload.validator';
import { DemosService } from './demos.service';
import { DEMO_PARSER } from './parsing/demo-parser.port';

const demoBytes = (size = 256) => Buffer.from(`${CS2_DEMO_MAGIC}${'x'.repeat(size)}`, 'latin1');

describe('Demos endpoints (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const register = async (username: string): Promise<string> =>
    (await http().post('/api/auth/register').send({ username, password: 'long-enough-pw' })).body
      .accessToken;
  const upload = (token: string, buffer = demoBytes(), name = 'match.dem') =>
    http().post('/api/demos').set(bearer(token)).attach('file', buffer, name);
  const idle = () => app.get(DemosService).whenIdle();

  beforeAll(async () => {
    ({ app } = await createTestApp({ devPlanSwitch: true, maxDemoBytes: 5_000 }, (builder) =>
      builder.overrideProvider(DEMO_PARSER).useValue({ parse: async () => generateSampleReplay() }),
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication on every route', async () => {
    await http().get('/api/demos').expect(401);
    await http().post('/api/demos').expect(401);
    await http().get('/api/demos/quota').expect(401);
  });

  describe('free user flow', () => {
    let token: string;
    let demoId: string;

    beforeAll(async () => {
      token = await register('free_flow');
    });

    it('starts with an available daily quota', async () => {
      const res = await http().get('/api/demos/quota').set(bearer(token)).expect(200);
      expect(res.body).toMatchObject({
        plan: 'free',
        limit: 1,
        used: 0,
        remaining: 1,
        allowed: true,
      });
    });

    it('accepts an upload with 202 and analyses it', async () => {
      const res = await upload(token).expect(202);
      demoId = res.body.id;
      expect(res.body).toMatchObject({ originalName: 'match.dem', status: 'processing' });
      await idle();
      const status = await http().get(`/api/demos/${demoId}`).set(bearer(token)).expect(200);
      expect(status.body).toMatchObject({ status: 'ready', map: 'sample_arena', roundCount: 3 });
    });

    it('lists the demo and exposes the replay and scoreboard', async () => {
      const list = await http().get('/api/demos').set(bearer(token)).expect(200);
      expect(list.body.map((d: { id: string }) => d.id)).toEqual([demoId]);
      const replay = await http().get(`/api/demos/${demoId}/replay`).set(bearer(token)).expect(200);
      expect(replay.body.rounds).toHaveLength(3);
      const board = await http()
        .get(`/api/demos/${demoId}/scoreboard`)
        .set(bearer(token))
        .expect(200);
      expect(board.body).toHaveLength(10);
    });

    it('returns a gated report that hides premium values', async () => {
      const res = await http()
        .get(`/api/demos/${demoId}/report`)
        .query({ player: SAMPLE_PLAYER_ID })
        .set(bearer(token))
        .expect(200);
      expect(res.body).toMatchObject({ plan: 'free', kast: null, rating: { value: null } });
      expect(res.body.lockedFeatures.length).toBeGreaterThan(0);
    });

    it('blocks a second upload the same day with a coded 403', async () => {
      const res = await upload(token).expect(403);
      expect(res.body).toMatchObject({ code: 'DAILY_QUOTA_EXCEEDED' });
      expect(res.body.resetsAt).toEqual(expect.any(String));
      const quota = await http().get('/api/demos/quota').set(bearer(token));
      expect(quota.body).toMatchObject({ used: 1, remaining: 0, allowed: false });
    });

    it('unlocks the full report and unlimited uploads once premium', async () => {
      await http()
        .put('/api/users/me/plan')
        .set(bearer(token))
        .send({ plan: 'premium' })
        .expect(200);
      const report = await http()
        .get(`/api/demos/${demoId}/report`)
        .query({ player: SAMPLE_PLAYER_ID })
        .set(bearer(token))
        .expect(200);
      expect(report.body).toMatchObject({ plan: 'premium', lockedFeatures: [] });
      expect(report.body.rating.value).toEqual(expect.any(Number));
      await upload(token).expect(202);
      await idle();
    });

    it('deletes a demo', async () => {
      await http().delete(`/api/demos/${demoId}`).set(bearer(token)).expect(204);
      await http().get(`/api/demos/${demoId}`).set(bearer(token)).expect(404);
    });
  });

  describe('validation and isolation', () => {
    let token: string;

    beforeAll(async () => {
      token = await register('validation_user');
    });

    it('rejects a request without a file', async () => {
      const res = await http().post('/api/demos').set(bearer(token)).expect(400);
      expect(res.body.code).toBe('FILE_REQUIRED');
    });

    it('rejects a non-demo file without consuming the quota', async () => {
      const res = await upload(token, Buffer.from('hello world'), 'notes.dem').expect(400);
      expect(res.body.code).toBe('INVALID_HEADER');
      const quota = await http().get('/api/demos/quota').set(bearer(token));
      expect(quota.body.used).toBe(0);
    });

    it('rejects an oversized upload with 413', async () => {
      await upload(token, demoBytes(10_000)).expect(413);
    });

    it('answers 400 for a malformed id and 404 for an unknown or foreign demo', async () => {
      await http().get('/api/demos/not-a-uuid').set(bearer(token)).expect(400);
      await http()
        .get('/api/demos/00000000-0000-4000-8000-000000000000')
        .set(bearer(token))
        .expect(404);

      const owner = await register('owner_user');
      const { body } = await upload(owner).expect(202);
      await idle();
      await http().get(`/api/demos/${body.id}`).set(bearer(token)).expect(404);
      await http().get(`/api/demos/${body.id}/replay`).set(bearer(token)).expect(404);
      await http().delete(`/api/demos/${body.id}`).set(bearer(token)).expect(404);
    });

    it('requires a player for the report and answers 404 for an unknown player', async () => {
      const owner = await register('report_user');
      const { body } = await upload(owner).expect(202);
      await idle();
      await http().get(`/api/demos/${body.id}/report`).set(bearer(owner)).expect(400);
      await http()
        .get(`/api/demos/${body.id}/report`)
        .query({ player: 'nobody' })
        .set(bearer(owner))
        .expect(404);
    });
  });
});
