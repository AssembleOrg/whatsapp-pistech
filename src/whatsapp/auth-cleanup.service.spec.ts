import { ConfigService } from '@nestjs/config';
import { AuthCleanupService } from './auth-cleanup.service';

const readdirMock = jest.fn();
const statMock = jest.fn();
const unlinkMock = jest.fn();

jest.mock('node:fs/promises', () => ({
  readdir: (...args: unknown[]) => readdirMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
  unlink: (...args: unknown[]) => unlinkMock(...args),
}));

describe('AuthCleanupService', () => {
  const createService = () => {
    const config = {
      get: jest.fn().mockReturnValue('/tmp/auth_info'),
    } as unknown as ConfigService;

    return new AuthCleanupService(config);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty stats when auth dir does not exist', async () => {
    const service = createService();
    readdirMock.mockResolvedValue([]);

    await expect(service.getStats()).resolves.toEqual({
      totalSizeMB: 0,
      preKeyCount: 0,
      fileCount: 0,
    });
  });

  it('computes stats with pre-keys and file sizes', async () => {
    const service = createService();

    readdirMock.mockResolvedValue([
      'pre-key-1',
      'pre-key-2',
      'session-1.json',
    ]);

    statMock
      .mockResolvedValueOnce({ size: 1024 * 1024 })
      .mockResolvedValueOnce({ size: 512 * 1024 })
      .mockResolvedValueOnce({ size: 256 * 1024 });

    await expect(service.getStats()).resolves.toEqual({
      totalSizeMB: 1.75,
      preKeyCount: 2,
      fileCount: 3,
    });
  });

  it('cleanup removes old pre-keys and temp files', async () => {
    const service = createService();

    const preKeys = Array.from({ length: 105 }, (_, i) => `pre-key-${i + 1}`);
    const tempFiles = ['cache.tmp', 'temp-file.json', 'db.lock'];
    readdirMock.mockResolvedValue([...preKeys, ...tempFiles, 'session-1.json']);
    statMock.mockResolvedValue({ size: 1024 });
    unlinkMock.mockResolvedValue(undefined);

    await service.cleanup();

    // 5 old pre-keys + 3 temp files
    expect(unlinkMock).toHaveBeenCalledTimes(8);
  });
});
