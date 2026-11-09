import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../test/create-test-app';

describe('GET /api/health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports the service as healthy', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns 404 for unknown routes', async () => {
    await request(app.getHttpServer()).get('/api/unknown').expect(404);
  });
});
