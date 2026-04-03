import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppService', () => {
  let setTimeoutSpy: jest.SpiedFunction<typeof setTimeout>;

  const createService = () => {
    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'AUTH_DIR') return '/tmp/auth_info';
        return undefined;
      }),
    } as unknown as ConfigService;

    return new WhatsAppService(config);
  };

  beforeEach(() => {
    setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((() => 1) as unknown as typeof setTimeout);
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  it('throws when trying to send while disconnected', async () => {
    const service = createService();

    await expect(service.sendText('123@s.whatsapp.net', 'hola')).rejects.toThrow(
      'WhatsApp is not connected',
    );
  });

  it('sends media payloads with defaults', async () => {
    const service = createService();
    const sendMessage = jest.fn().mockResolvedValue({ key: { id: 'm1' } });

    (service as unknown as { connectionState: string }).connectionState = 'open';
    (
      service as unknown as {
        sock: { sendMessage: typeof sendMessage };
      }
    ).sock = { sendMessage };

    await service.sendAudio('1@s.whatsapp.net', Buffer.from('x'));
    await service.sendDocument('1@s.whatsapp.net', Buffer.from('x'), 'a.txt');

    expect(sendMessage).toHaveBeenNthCalledWith(1, '1@s.whatsapp.net', {
      audio: Buffer.from('x'),
      mimetype: 'audio/mpeg',
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, '1@s.whatsapp.net', {
      document: Buffer.from('x'),
      fileName: 'a.txt',
      mimetype: 'application/octet-stream',
      caption: undefined,
    });
  });

  it('maps group list from socket response', async () => {
    const service = createService();

    (service as unknown as { connectionState: string }).connectionState = 'open';
    (
      service as unknown as {
        sock: {
          groupFetchAllParticipating: () => Promise<
            Record<string, { id: string; subject: string }>
          >;
        };
      }
    ).sock = {
      groupFetchAllParticipating: async () => ({
        '1@g.us': { id: '1@g.us', subject: 'Group One' },
        '2@g.us': { id: '2@g.us', subject: 'Group Two' },
      }),
    };

    await expect(service.getGroups()).resolves.toEqual([
      { id: '1@g.us', subject: 'Group One' },
      { id: '2@g.us', subject: 'Group Two' },
    ]);
  });
});
