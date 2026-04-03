import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthCleanupService } from '../whatsapp/auth-cleanup.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly authCleanup: AuthCleanupService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'whatsapp-pistech',
    };
  }

  @Get('ping')
  @ApiOperation({ summary: 'Ping/pong' })
  ping() {
    return { pong: true, timestamp: new Date().toISOString() };
  }

  @Get('auth/stats')
  @ApiOperation({ summary: 'Auth directory statistics' })
  async authStats() {
    return this.authCleanup.getStats();
  }
}
