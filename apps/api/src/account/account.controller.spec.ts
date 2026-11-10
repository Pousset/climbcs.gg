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
