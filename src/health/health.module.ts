import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { WhatsAppModule } from '../whatsapp/whatsapp.module.js';

@Module({
  imports: [WhatsAppModule],
  controllers: [HealthController],
})
export class HealthModule {}
