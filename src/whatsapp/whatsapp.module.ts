import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service.js';
import { WhatsAppController } from './whatsapp.controller.js';
import { AuthCleanupService } from './auth-cleanup.service.js';

@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, AuthCleanupService],
  exports: [WhatsAppService, AuthCleanupService],
})
export class WhatsAppModule {}
