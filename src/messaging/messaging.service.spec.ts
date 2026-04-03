import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

describe('MessagingService', () => {
  const createService = (overrides?: {
    isConnected?: boolean;
    whitelistedGroups?: string;
  }) => {
    const whatsapp = {
      isConnected: jest.fn().mockReturnValue(overrides?.isConnected ?? true),
      sendText: jest.fn().mockResolvedValue(undefined),
      sendImage: jest.fn().mockResolvedValue(undefined),
      sendVideo: jest.fn().mockResolvedValue(undefined),
      sendAudio: jest.fn().mockResolvedValue(undefined),
      sendDocument: jest.fn().mockResolvedValue(undefined),
      sendLocation: jest.fn().mockResolvedValue(undefined),
      sendContact: jest.fn().mockResolvedValue(undefined),
      getGroups: jest.fn().mockResolvedValue([{ id: 'g1@g.us', subject: 'Grupo 1' }]),
    } as unknown as WhatsAppService;

    const configMap: Record<string, string | number> = {
      MESSAGE_DELAY_MIN: 0,
      MESSAGE_DELAY_MAX: 1,
      WHITELISTED_GROUPS: overrides?.whitelistedGroups ?? '',
    };

    const config = {
      get: jest.fn((key: string) => configMap[key]),
    } as unknown as ConfigService;

    const service = new MessagingService(whatsapp, config);
    const serviceAny = service as any;
    jest.spyOn(serviceAny, 'randomDelay').mockReturnValue(0);
    jest.spyOn(serviceAny, 'sleep').mockResolvedValue(undefined);

    return { service, whatsapp };
  };

  it('normalizes phone number and sends queued text', async () => {
    const { service, whatsapp } = createService();

    await service.enqueueText('+54 9 11 1234-5678', 'hola');

    expect(whatsapp.sendText).toHaveBeenCalledWith(
      '5491112345678@s.whatsapp.net',
      'hola',
    );
  });

  it('preserves JID when destination already contains @', async () => {
    const { service, whatsapp } = createService();

    await service.enqueueText('abc123@g.us', 'mensaje');

    expect(whatsapp.sendText).toHaveBeenCalledWith('abc123@g.us', 'mensaje');
  });

  it('rejects invalid short phone numbers', async () => {
    const { service } = createService();

    await expect(service.enqueueText('123', 'hola')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects non-whitelisted groups', async () => {
    const { service } = createService({
      whitelistedGroups: 'allowed@g.us,other@g.us',
    });

    await expect(service.enqueueText('blocked@g.us', 'hola')).rejects.toThrow(
      'not whitelisted',
    );
  });

  it('throws ServiceUnavailable when WhatsApp is disconnected', async () => {
    const { service } = createService({ isConnected: false });

    await expect(service.enqueueText('12345678', 'hola')).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(service.getGroups()).rejects.toThrow(ServiceUnavailableException);
  });

  it('returns groups when connected', async () => {
    const { service, whatsapp } = createService();

    await expect(service.getGroups()).resolves.toEqual([
      { id: 'g1@g.us', subject: 'Grupo 1' },
    ]);
    expect(whatsapp.getGroups).toHaveBeenCalledTimes(1);
  });

  it('processes queued messages sequentially', async () => {
    const { service, whatsapp } = createService();
    const sendOrder: string[] = [];

    (whatsapp.sendText as jest.Mock).mockImplementation(
      async (_jid: string, text: string) => {
        sendOrder.push(text);
      },
    );

    await Promise.all([
      service.enqueueText('12345678', 'first'),
      service.enqueueText('12345678', 'second'),
    ]);

    expect(sendOrder).toEqual(['first', 'second']);
  });

  it('builds and sends issue reports as text + json document', async () => {
    const { service, whatsapp } = createService({ whitelistedGroups: 'team@g.us' });

    await service.reportIssue({
      groupJid: 'team@g.us',
      description: 'x'.repeat(250),
      appName: 'Portal',
      userId: 'user-42',
      recentRequests: [{ method: 'GET', url: '/health', statusCode: 200 }],
    });

    expect(whatsapp.sendText).toHaveBeenCalledWith(
      'team@g.us',
      expect.stringContaining('*Nuevo reporte de problema* | Portal | Usuario: user-42'),
    );

    const [jid, buffer, filename, mimetype, caption] = (
      whatsapp.sendDocument as jest.Mock
    ).mock.calls[0] as [string, Buffer, string, string, string];

    expect(jid).toBe('team@g.us');
    expect(filename).toMatch(/^issue-report-.*\.json$/);
    expect(mimetype).toBe('application/json');
    expect(caption).toBe('Reporte completo con requests adjunto');

    const payload = JSON.parse(buffer.toString('utf-8')) as {
      description: string;
      appName: string;
      userId: string;
      recentRequests: unknown[];
      timestamp: string;
    };

    expect(payload.description).toHaveLength(250);
    expect(payload.appName).toBe('Portal');
    expect(payload.userId).toBe('user-42');
    expect(payload.recentRequests).toHaveLength(1);
    expect(typeof payload.timestamp).toBe('string');
  });
});
