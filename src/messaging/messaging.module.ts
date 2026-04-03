import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';

@Module({
  imports: [WhatsAppModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
