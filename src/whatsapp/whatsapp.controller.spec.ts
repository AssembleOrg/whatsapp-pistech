import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr'),
  },
}));

describe('WhatsAppController', () => {
  const createController = () => {
    const whatsapp = {
      getConnectionState: jest.fn().mockReturnValue('connecting'),
      getQrCode: jest.fn().mockReturnValue('qr-data'),
      clearSession: jest.fn().mockResolvedValue(undefined),
    } as unknown as WhatsAppService;

    const config = {
      get: jest.fn().mockReturnValue('secret-pass'),
    } as unknown as ConfigService;

    const controller = new WhatsAppController(whatsapp, config);
    return { controller, whatsapp };
  };

  const createResponse = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    return res;
  };

  it('renders password page when no password is provided', () => {
    const { controller } = createController();
    const res = createResponse();

    controller.getQrPage('', res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<form method="GET"'));
  });

  it('returns unauthorized page for invalid password', () => {
    const { controller } = createController();
    const res = createResponse();

    controller.getQrPage('wrong', res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('Contrasena incorrecta'),
    );
  });

  it('renders qr page for valid password', () => {
    const { controller } = createController();
    const res = createResponse();

    controller.getQrPage('secret-pass', res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("const PASSWORD = 'secret-pass'"));
  });

  it('returns status data', () => {
    const { controller } = createController();

    expect(controller.getStatus()).toEqual({
      state: 'connecting',
      hasQR: true,
    });
  });

  it('protects qr-data endpoint by password', () => {
    const { controller } = createController();
    const res = createResponse();

    controller.getQrData('wrong', res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns qr-data for valid password', async () => {
    const { controller } = createController();
    const res = createResponse();

    await controller.getQrData('secret-pass', res as any);

    expect(res.json).toHaveBeenCalledWith({
      qrImage: 'data:image/png;base64,mock-qr',
      state: 'connecting',
    });
  });

  it('clears session only with valid password', async () => {
    const { controller, whatsapp } = createController();
    const unauthorizedRes = createResponse();

    await controller.clearSession('wrong', unauthorizedRes as any);

    expect(unauthorizedRes.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(whatsapp.clearSession).not.toHaveBeenCalled();

    const okRes = createResponse();
    await controller.clearSession('secret-pass', okRes as any);

    expect(whatsapp.clearSession).toHaveBeenCalledTimes(1);
    expect(okRes.json).toHaveBeenCalledWith({
      message: 'Session cleared, reconnecting...',
    });
  });
});
