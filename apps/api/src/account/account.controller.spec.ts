import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../test/create-test-app';

describe('GET /api/users/me (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createTestApp());
    const res = await http()
      .post('/api/auth/register')
      .send({ username: 'Me_User', password: 'my-password' });
    token = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the authenticated user without sensitive fields', async () => {
    const res = await http()
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({ username: 'Me_User', plan: 'free' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|usernameKey/);
  });

  it('rejects requests without a token', async () => {
    await http().get('/api/users/me').expect(401);
  });

  it('rejects a malformed or forged token', async () => {
    await http().get('/api/users/me').set('Authorization', 'Bearer not.a.jwt').expect(401);
    await http().get('/api/users/me').set('Authorization', `Basic ${token}`).expect(401);
  });

  it('rejects an expired token', async () => {
    const jwt = app.get(JwtService);
    const expired = await jwt.signAsync({ sub: 'whatever' }, { expiresIn: -10 });
    await http().get('/api/users/me').set('Authorization', `Bearer ${expired}`).expect(401);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const jwt = app.get(JwtService);
    const orphan = await jwt.signAsync({ sub: '00000000-0000-0000-0000-000000000000' });
    await http().get('/api/users/me').set('Authorization', `Bearer ${orphan}`).expect(401);
  });
});

describe('PUT /api/users/me/plan (e2e)', () => {
  const register = async (app: INestApplication, username: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username, password: 'my-password' });
    return res.body.accessToken as string;
  };

  describe('when the dev plan switch is enabled', () => {
    let app: INestApplication;
    let token: string;

    beforeAll(async () => {
      ({ app } = await createTestApp({ devPlanSwitch: true }));
      token = await register(app, 'Switcher');
    });

    afterAll(async () => {
      await app.close();
    });

    it('switches the plan and persists it', async () => {
      const put = await request(app.getHttpServer())
        .put('/api/users/me/plan')
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: 'premium' })
        .expect(200);
      expect(put.body.plan).toBe('premium');
      const me = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(me.body.plan).toBe('premium');
    });

    it('rejects an unknown plan and unauthenticated calls', async () => {
      await request(app.getHttpServer())
        .put('/api/users/me/plan')
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: 'enterprise' })
        .expect(400);
      await request(app.getHttpServer())
        .put('/api/users/me/plan')
        .send({ plan: 'free' })
        .expect(401);
    });
  });

  describe('when the dev plan switch is disabled (default)', () => {
    it('behaves as if the route does not exist', async () => {
      const { app } = await createTestApp();
      const token = await register(app, 'NoSwitch');
      await request(app.getHttpServer())
        .put('/api/users/me/plan')
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: 'premium' })
        .expect(404);
      await app.close();
    });
  });
});
