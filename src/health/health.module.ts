import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  controllers: [HealthController],
})
export class HealthModule {}
