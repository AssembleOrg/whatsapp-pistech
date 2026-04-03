import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../src/health/health.controller';
import { AuthCleanupService } from '../src/whatsapp/auth-cleanup.service';

describe('Health module integration (e2e)', () => {
  let controller: HealthController;
  const statsMock = {
    totalSizeMB: 0.3,
    preKeyCount: 2,
    fileCount: 8,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: AuthCleanupService,
          useValue: {
            getStats: jest.fn().mockResolvedValue(statsMock),
          },
        },
      ],
    }).compile();

    controller = moduleFixture.get(HealthController);
  });

  it('returns health payload', () => {
    expect(controller.health()).toEqual({
      status: 'ok',
      service: 'whatsapp-pistech',
      timestamp: expect.any(String),
    });
  });

  it('returns ping payload', () => {
    expect(controller.ping()).toEqual({
      pong: true,
      timestamp: expect.any(String),
    });
  });

  it('returns auth stats payload', async () => {
    await expect(controller.authStats()).resolves.toEqual(statsMock);
  });
});
