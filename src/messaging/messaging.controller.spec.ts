import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

describe('MessagingController', () => {
  const createController = () => {
    const messaging = {
      enqueueText: jest.fn().mockResolvedValue(undefined),
      enqueueImage: jest.fn().mockResolvedValue(undefined),
      enqueueVideo: jest.fn().mockResolvedValue(undefined),
      enqueueAudio: jest.fn().mockResolvedValue(undefined),
      enqueueDocument: jest.fn().mockResolvedValue(undefined),
      enqueueLocation: jest.fn().mockResolvedValue(undefined),
      enqueueContact: jest.fn().mockResolvedValue(undefined),
      reportIssue: jest.fn().mockResolvedValue(undefined),
      getGroups: jest.fn().mockResolvedValue([]),
    } as unknown as MessagingService;

    return { controller: new MessagingController(messaging), messaging };
  };

  it('queues text messages', async () => {
    const { controller, messaging } = createController();

    await expect(
      controller.sendText({ to: '12345678', message: 'hola' }),
    ).resolves.toEqual({ status: 'queued' });
    expect(messaging.enqueueText).toHaveBeenCalledWith('12345678', 'hola');
  });

  it('queues image/video/audio/document/location/contact messages', async () => {
    const { controller, messaging } = createController();

    await controller.sendImage({
      to: '12345678',
      base64: 'YmFzZTY0',
      mimetype: 'image/jpeg',
      caption: 'img',
    });
    await controller.sendVideo({
      to: '12345678',
      base64: 'YmFzZTY0',
      mimetype: 'video/mp4',
      caption: 'vid',
    });
    await controller.sendAudio({
      to: '12345678',
      base64: 'YmFzZTY0',
      mimetype: 'audio/mpeg',
    });
    await controller.sendDocument({
      to: '12345678',
      base64: 'YmFzZTY0',
      filename: 'a.txt',
      mimetype: 'text/plain',
      caption: 'doc',
    });
    await controller.sendLocation({
      to: '12345678',
      latitude: -34.6,
      longitude: -58.4,
      name: 'Buenos Aires',
    });
    await controller.sendContact({
      to: '12345678',
      displayName: 'Juan Perez',
      vcard: 'BEGIN:VCARD',
    });

    expect(messaging.enqueueImage).toHaveBeenCalledWith(
      '12345678',
      'YmFzZTY0',
      'image/jpeg',
      'img',
    );
    expect(messaging.enqueueVideo).toHaveBeenCalledWith(
      '12345678',
      'YmFzZTY0',
      'video/mp4',
      'vid',
    );
    expect(messaging.enqueueAudio).toHaveBeenCalledWith(
      '12345678',
      'YmFzZTY0',
      'audio/mpeg',
    );
    expect(messaging.enqueueDocument).toHaveBeenCalledWith(
      '12345678',
      'YmFzZTY0',
      'a.txt',
      'text/plain',
      'doc',
    );
    expect(messaging.enqueueLocation).toHaveBeenCalledWith(
      '12345678',
      -34.6,
      -58.4,
      'Buenos Aires',
    );
    expect(messaging.enqueueContact).toHaveBeenCalledWith(
      '12345678',
      'Juan Perez',
      'BEGIN:VCARD',
    );
  });

  it('queues report issues and lists groups', async () => {
    const { controller, messaging } = createController();
    const dto = {
      groupJid: '123@g.us',
      description: 'No responde',
      userId: 'u-1',
      appName: 'CRM',
      recentRequests: [],
    };

    await expect(controller.reportIssue(dto)).resolves.toEqual({ status: 'queued' });
    expect(messaging.reportIssue).toHaveBeenCalledWith(dto);

    await expect(controller.getGroups()).resolves.toEqual([]);
    expect(messaging.getGroups).toHaveBeenCalledTimes(1);
  });
});
