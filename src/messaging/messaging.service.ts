import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import type { ReportIssueDto } from './dto/report-issue.dto.js';

interface QueueItem {
  execute: () => Promise<void>;
  resolve: () => void;
  reject: (err: Error) => void;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly queue: QueueItem[] = [];
  private processing = false;
  private lastSentAt = 0;
  private readonly delayMin: number;
  private readonly delayMax: number;
  private readonly whitelistedGroups: Set<string>;

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {
    this.delayMin = this.config.get<number>('MESSAGE_DELAY_MIN')!;
    this.delayMax = this.config.get<number>('MESSAGE_DELAY_MAX')!;
    const groups = this.config.get<string>('WHITELISTED_GROUPS') ?? '';
    this.whitelistedGroups = new Set(
      groups.split(',').map((g) => g.trim()).filter(Boolean),
    );
  }

  async enqueueText(to: string, message: string): Promise<void> {
    const jid = this.resolveJid(to);
    return this.enqueue(() => this.whatsapp.sendText(jid, message));
  }

  async enqueueImage(
    to: string,
    base64: string,
    mimetype?: string,
    caption?: string,
  ): Promise<void> {
    const jid = this.resolveJid(to);
    const buffer = Buffer.from(base64, 'base64');
    return this.enqueue(() =>
      this.whatsapp.sendImage(jid, buffer, caption, mimetype),
    );
  }

  async enqueueVideo(
    to: string,
    base64: string,
    mimetype?: string,
    caption?: string,
  ): Promise<void> {
    const jid = this.resolveJid(to);
    const buffer = Buffer.from(base64, 'base64');
    return this.enqueue(() =>
      this.whatsapp.sendVideo(jid, buffer, caption, mimetype),
    );
  }

  async enqueueAudio(
    to: string,
    base64: string,
    mimetype?: string,
  ): Promise<void> {
    const jid = this.resolveJid(to);
    const buffer = Buffer.from(base64, 'base64');
    return this.enqueue(() => this.whatsapp.sendAudio(jid, buffer, mimetype));
  }

  async enqueueDocument(
    to: string,
    base64: string,
    filename: string,
    mimetype?: string,
    caption?: string,
  ): Promise<void> {
    const jid = this.resolveJid(to);
    const buffer = Buffer.from(base64, 'base64');
    return this.enqueue(() =>
      this.whatsapp.sendDocument(jid, buffer, filename, mimetype, caption),
    );
  }

  async enqueueLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
  ): Promise<void> {
    const jid = this.resolveJid(to);
    return this.enqueue(() =>
      this.whatsapp.sendLocation(jid, latitude, longitude, name),
    );
  }

  async enqueueContact(
    to: string,
    displayName: string,
    vcard: string,
  ): Promise<void> {
    const jid = this.resolveJid(to);
    return this.enqueue(() =>
      this.whatsapp.sendContact(jid, displayName, vcard),
    );
  }

  async reportIssue(dto: ReportIssueDto): Promise<void> {
    this.validateGroupWhitelist(dto.groupJid);

    const now = new Date();

    const report = {
      timestamp: now.toISOString(),
      appName: dto.appName ?? null,
      userId: dto.userId ?? null,
      description: dto.description,
      recentRequests: dto.recentRequests ?? [],
    };

    const filename = `issue-report-${now.toISOString().replace(/[:.]/g, '-')}.json`;
    const buffer = Buffer.from(JSON.stringify(report, null, 2), 'utf-8');

    const briefMessage = `*Nuevo reporte de problema*${dto.appName ? ` | ${dto.appName}` : ''}${dto.userId ? ` | Usuario: ${dto.userId}` : ''}\n\n${dto.description.substring(0, 200)}${dto.description.length > 200 ? '...' : ''}`;

    await this.enqueue(() => this.whatsapp.sendText(dto.groupJid, briefMessage));
    await this.enqueue(() =>
      this.whatsapp.sendDocument(
        dto.groupJid,
        buffer,
        filename,
        'application/json',
        'Reporte completo con requests adjunto',
      ),
    );
  }

  async getGroups(): Promise<Array<{ id: string; subject: string }>> {
    if (!this.whatsapp.isConnected()) {
      throw new ServiceUnavailableException('WhatsApp is not connected');
    }
    return this.whatsapp.getGroups();
  }

  private resolveJid(to: string): string {
    // Already a JID
    if (to.includes('@')) {
      if (to.endsWith('@g.us')) {
        this.validateGroupWhitelist(to);
      }
      return to;
    }
    // Phone number - normalize
    const cleaned = to.replace(/[^0-9]/g, '');
    if (cleaned.length < 8) {
      throw new BadRequestException('Invalid phone number');
    }
    return `${cleaned}@s.whatsapp.net`;
  }

  private validateGroupWhitelist(groupJid: string): void {
    if (
      this.whitelistedGroups.size > 0 &&
      !this.whitelistedGroups.has(groupJid)
    ) {
      throw new BadRequestException(
        `Group ${groupJid} is not whitelisted`,
      );
    }
  }

  private enqueue(execute: () => Promise<void>): Promise<void> {
    if (!this.whatsapp.isConnected()) {
      throw new ServiceUnavailableException('WhatsApp is not connected');
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ execute, resolve, reject });
      void this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      // Wait for delay since last sent message
      const elapsed = Date.now() - this.lastSentAt;
      const delay = this.randomDelay();
      const waitTime = Math.max(0, delay - elapsed);

      if (waitTime > 0) {
        await this.sleep(waitTime);
      }

      try {
        await item.execute();
        this.lastSentAt = Date.now();
        item.resolve();
      } catch (err) {
        this.logger.error(`Failed to send message: ${(err as Error).message}`);
        item.reject(err as Error);
      }
    }

    this.processing = false;
  }

  private randomDelay(): number {
    return (
      Math.floor(Math.random() * (this.delayMax - this.delayMin)) +
      this.delayMin
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
