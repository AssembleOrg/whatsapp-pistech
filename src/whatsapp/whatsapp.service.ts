import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
  type BaileysEventMap,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';

export type ConnectionState = 'disconnected' | 'connecting' | 'open';

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private sock: WASocket | null = null;
  private qrCode: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private readonly authDir: string;
  private saveCreds: (() => Promise<void>) | null = null;
  private readonly sentMessages = new Set<string>();

  constructor(private readonly config: ConfigService) {
    this.authDir = this.config.get<string>('AUTH_DIR')!;
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.sock?.end(undefined);
    this.sock = null;
  }

  async connect(): Promise<void> {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    this.saveCreds = saveCreds;

    this.sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      browser: ['Pistech Bot', 'Desktop', '1.0.0'],
      logger: {
        level: 'silent',
        child: () => this.createSilentLogger(),
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
      } as any,
    });

    this.sock.ev.on('creds.update', () => {
      void this.saveCreds?.();
    });

    this.sock.ev.on(
      'connection.update',
      this.handleConnectionUpdate.bind(this),
    );

    // Handler prepared for future use - does NOT log message content
    this.sock.ev.on('messages.upsert', (_msg: BaileysEventMap['messages.upsert']) => {
      // Intentionally empty - receiving messages is not active
      // Future: process incoming messages here
    });
  }

  private handleConnectionUpdate(
    update: BaileysEventMap['connection.update'],
  ) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.qrCode = qr;
      this.connectionState = 'connecting';
      this.logger.log('QR code generated - scan to authenticate');
    }

    if (connection === 'connecting') {
      this.connectionState = 'connecting';
    }

    if (connection === 'open') {
      this.qrCode = null;
      this.connectionState = 'open';
      this.logger.log('WhatsApp connected');
      void this.sock?.sendPresenceUpdate('unavailable').catch(() => {});
    }

    if (connection === 'close') {
      this.connectionState = 'disconnected';
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      if (isLoggedOut) {
        this.logger.warn('Session logged out - clear session and re-scan QR');
      } else {
        this.logger.warn(`Connection closed (code: ${statusCode}) - reconnecting`);
        void this.connect();
      }
    }
  }

  private createSilentLogger(): any {
    return {
      level: 'silent',
      child: () => this.createSilentLogger(),
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {},
    };
  }

  getQrCode(): string | null {
    return this.qrCode;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'open';
  }

  async clearSession(): Promise<void> {
    this.sock?.end(undefined);
    this.sock = null;
    this.qrCode = null;
    this.connectionState = 'disconnected';
    await rm(this.authDir, { recursive: true, force: true });
    this.logger.log('Session cleared');
    await this.connect();
  }

  async sendText(jid: string, text: string): Promise<void> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(jid, { text });
    this.trackSentMessage(result?.key?.id);
  }

  async sendImage(
    jid: string,
    buffer: Buffer,
    caption?: string,
    mimetype?: string,
  ): Promise<void> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(jid, {
      image: buffer,
      caption,
      mimetype: mimetype as any,
    });
    this.trackSentMessage(result?.key?.id);
  }

  async sendVideo(
    jid: string,
    buffer: Buffer,
    caption?: string,
    mimetype?: string,
  ): Promise<void> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(jid, {
      video: buffer,
      caption,
      mimetype: mimetype as any,
    });
    this.trackSentMessage(result?.key?.id);
  }

  async sendAudio(jid: string, buffer: Buffer, mimetype?: string): Promise<void> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(jid, {
      audio: buffer,
      mimetype: (mimetype as any) ?? 'audio/mpeg',
    });
    this.trackSentMessage(result?.key?.id);
  }

  async sendDocument(
    jid: string,
    buffer: Buffer,
    filename: string,
    mimetype?: string,
    caption?: string,
  ): Promise<void> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(jid, {
      document: buffer,
      fileName: filename,
      mimetype: (mimetype as any) ?? 'application/octet-stream',
      caption,
    });
    this.trackSentMessage(result?.key?.id);
  }

  async sendLocation(
    jid: string,
    latitude: number,
    longitude: number,
    name?: string,
  ): Promise<void> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(jid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name,
      },
    });
    this.trackSentMessage(result?.key?.id);
  }

  async sendContact(
    jid: string,
    displayName: string,
    vcard: string,
  ): Promise<void> {
    this.ensureConnected();
    const result = await this.sock!.sendMessage(jid, {
      contacts: {
        displayName,
        contacts: [{ displayName, vcard }],
      },
    });
    this.trackSentMessage(result?.key?.id);
  }

  async getGroups(): Promise<Array<{ id: string; subject: string }>> {
    this.ensureConnected();
    const groups = await this.sock!.groupFetchAllParticipating();
    return Object.values(groups).map((g) => ({
      id: g.id,
      subject: g.subject,
    }));
  }

  private ensureConnected(): void {
    if (!this.isConnected() || !this.sock) {
      throw new Error('WhatsApp is not connected');
    }
  }

  private trackSentMessage(messageId: string | null | undefined): void {
    if (messageId) {
      this.sentMessages.add(messageId);
      setTimeout(() => this.sentMessages.delete(messageId), 30_000);
    }
  }
}
