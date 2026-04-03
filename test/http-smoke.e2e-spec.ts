import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const runHttpSmoke = process.env.RUN_HTTP_SMOKE === 'true';
const httpDescribe = runHttpSmoke ? describe : describe.skip;

httpDescribe('HTTP smoke (e2e)', () => {
  let app: INestApplication;
  let setIntervalSpy: jest.SpiedFunction<typeof setInterval>;

  beforeAll(async () => {
    setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((() => 1) as unknown as typeof setInterval);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    setIntervalSpy?.mockRestore();
    if (app) {
      await app.close();
    }
  });

  it('GET /health', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'whatsapp-pistech',
      timestamp: expect.any(String),
    });
  });

  it('GET /ping', async () => {
    const response = await request(app.getHttpServer()).get('/ping').expect(200);

    expect(response.body).toEqual({
      pong: true,
      timestamp: expect.any(String),
    });
  });

  it('GET /whatsapp/status', async () => {
    const response = await request(app.getHttpServer())
      .get('/whatsapp/status')
      .expect(200);

    expect(response.body).toEqual({
      state: expect.any(String),
      hasQR: expect.any(Boolean),
    });
  });

  it('GET /whatsapp/qr-data rejects invalid password', async () => {
    const response = await request(app.getHttpServer())
      .get('/whatsapp/qr-data')
      .query({ password: 'wrong' })
      .expect(401);

    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('GET /api/groups enforces API key', async () => {
    await request(app.getHttpServer()).get('/api/groups').expect(401);

    await request(app.getHttpServer())
      .get('/api/groups')
      .set('x-api-key', 'test-api-key')
      .expect(503);
  });
});
