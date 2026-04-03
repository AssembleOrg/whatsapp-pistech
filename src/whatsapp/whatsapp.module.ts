import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { AuthCleanupService } from './auth-cleanup.service';

@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, AuthCleanupService],
  exports: [WhatsAppService, AuthCleanupService],
})
export class WhatsAppModule {}
