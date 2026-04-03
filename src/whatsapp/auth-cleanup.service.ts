import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class AuthCleanupService implements OnModuleInit {
  private readonly logger = new Logger(AuthCleanupService.name);
  private readonly authDir: string;
  private readonly maxPreKeys = 100;
  private readonly maxDirSizeMB = 50;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly config: ConfigService) {
    this.authDir = this.config.get<string>('AUTH_DIR')!;
  }

  async onModuleInit() {
    await this.cleanup();
    this.timer = setInterval(() => void this.cleanup(), 24 * 60 * 60 * 1000);
  }

  async cleanup(): Promise<void> {
    try {
      const files = await readdir(this.authDir).catch(() => []);
      if (files.length === 0) return;

      await this.cleanPreKeys(files);
      await this.cleanTempFiles(files);
      await this.checkSize(files);
    } catch {
      // Auth dir may not exist yet
    }
  }

  async getStats(): Promise<{
    totalSizeMB: number;
    preKeyCount: number;
    fileCount: number;
  }> {
    const files = await readdir(this.authDir).catch(() => []);
    const preKeys = files.filter((f) => f.startsWith('pre-key-'));
    let totalSize = 0;
    for (const file of files) {
      const s = await stat(join(this.authDir, file)).catch(() => null);
      if (s) totalSize += s.size;
    }

    return {
      totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
      preKeyCount: preKeys.length,
      fileCount: files.length,
    };
  }

  private async cleanPreKeys(files: string[]): Promise<void> {
    const preKeys = files
      .filter((f) => f.startsWith('pre-key-'))
      .sort((a, b) => {
        const numA = parseInt(a.replace('pre-key-', ''), 10);
        const numB = parseInt(b.replace('pre-key-', ''), 10);
        return numA - numB;
      });

    if (preKeys.length > this.maxPreKeys) {
      const toDelete = preKeys.slice(0, preKeys.length - this.maxPreKeys);
      for (const file of toDelete) {
        await unlink(join(this.authDir, file)).catch(() => {});
      }
      this.logger.log(`Cleaned ${toDelete.length} old pre-keys`);
    }
  }

  private async cleanTempFiles(files: string[]): Promise<void> {
    const tempPatterns = ['.tmp-', 'temp-', '.tmp', '.lock'];
    const tempFiles = files.filter((f) =>
      tempPatterns.some((p) => f.includes(p)),
    );

    for (const file of tempFiles) {
      await unlink(join(this.authDir, file)).catch(() => {});
    }
    if (tempFiles.length > 0) {
      this.logger.log(`Cleaned ${tempFiles.length} temp files`);
    }
  }

  private async checkSize(files: string[]): Promise<void> {
    let totalSize = 0;
    for (const file of files) {
      const s = await stat(join(this.authDir, file)).catch(() => null);
      if (s) totalSize += s.size;
    }
    const sizeMB = totalSize / 1024 / 1024;
    if (sizeMB > this.maxDirSizeMB) {
      this.logger.warn(`Auth dir size: ${sizeMB.toFixed(2)}MB exceeds ${this.maxDirSizeMB}MB`);
    }
  }
}
