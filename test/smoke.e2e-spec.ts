import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { HealthController } from '../src/health/health.controller';
import { MessagingController } from '../src/messaging/messaging.controller';
import { MessagingService } from '../src/messaging/messaging.service';
import { WhatsAppController } from '../src/whatsapp/whatsapp.controller';

describe('Application smoke (e2e)', () => {
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

  it('boots AppModule and resolves core controllers', () => {
    expect(app.get(HealthController)).toBeDefined();
    expect(app.get(MessagingController)).toBeDefined();
    expect(app.get(WhatsAppController)).toBeDefined();
  });

  it('serves basic health payload through controller', () => {
    const health = app.get(HealthController).health();
    expect(health).toEqual({
      status: 'ok',
      service: 'whatsapp-pistech',
      timestamp: expect.any(String),
    });
  });

  it('keeps messaging guarded when WhatsApp is not connected yet', async () => {
    const messaging = app.get(MessagingService);
    await expect(messaging.getGroups()).rejects.toThrow(ServiceUnavailableException);
  });
});
