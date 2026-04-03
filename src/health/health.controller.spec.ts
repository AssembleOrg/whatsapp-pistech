import { AuthCleanupService } from '../whatsapp/auth-cleanup.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns service health payload', () => {
    const authCleanup = {
      getStats: jest.fn(),
    } as unknown as AuthCleanupService;
    const controller = new HealthController(authCleanup);

    const result = controller.health();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('whatsapp-pistech');
    expect(typeof result.timestamp).toBe('string');
  });

  it('returns ping payload', () => {
    const authCleanup = {
      getStats: jest.fn(),
    } as unknown as AuthCleanupService;
    const controller = new HealthController(authCleanup);

    const result = controller.ping();

    expect(result.pong).toBe(true);
    expect(typeof result.timestamp).toBe('string');
  });

  it('returns auth stats from service', async () => {
    const stats = { totalSizeMB: 1.25, preKeyCount: 10, fileCount: 20 };
    const authCleanup = {
      getStats: jest.fn().mockResolvedValue(stats),
    } as unknown as AuthCleanupService;
    const controller = new HealthController(authCleanup);

    await expect(controller.authStats()).resolves.toEqual(stats);
    expect(authCleanup.getStats).toHaveBeenCalledTimes(1);
  });
});
