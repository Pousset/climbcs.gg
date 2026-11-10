import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../test/create-test-app';

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('creates an account and returns a token without sensitive fields', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ username: 'Mathis', password: 'correct-horse' })
        .expect(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ username: 'Mathis', plan: 'free' });
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|usernameKey/);
    });

    it('rejects a duplicate username, ignoring case', async () => {
      await http()
        .post('/api/auth/register')
        .send({ username: 'Dupe', password: 'password-1' })
        .expect(201);
      await http()
        .post('/api/auth/register')
        .send({ username: 'dUPE', password: 'password-2' })
        .expect(409);
    });

    it('rejects invalid payloads with the list of issues', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ username: 'a b', password: 'short' })
        .expect(400);
      expect(res.body.issues.map((i: { path: string }) => i.path).sort()).toEqual([
        'password',
        'username',
      ]);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      await http()
        .post('/api/auth/register')
        .send({ username: 'Login_User', password: 'right-password' });
    });

    it('returns a token for valid credentials (username is case-insensitive)', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ username: 'login_user', password: 'right-password' })
        .expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.username).toBe('Login_User');
    });

    it('rejects a wrong password and an unknown user identically', async () => {
      const wrong = await http()
        .post('/api/auth/login')
        .send({ username: 'login_user', password: 'wrong-password' })
        .expect(401);
      const unknown = await http()
        .post('/api/auth/login')
        .send({ username: 'ghost', password: 'whatever-1' })
        .expect(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('rejects malformed payloads', async () => {
      await http().post('/api/auth/login').send({}).expect(400);
    });
  });
});
