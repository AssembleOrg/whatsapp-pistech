import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { MessagingService } from './messaging.service.js';
import {
  SendTextDto,
  SendImageDto,
  SendVideoDto,
  SendAudioDto,
  SendDocumentDto,
  SendLocationDto,
  SendContactDto,
} from './dto/send-message.dto.js';
import { ReportIssueDto } from './dto/report-issue.dto.js';

@ApiTags('messaging')
@ApiHeader({ name: 'x-api-key', required: true, description: 'API key for authentication' })
@UseGuards(ApiKeyGuard)
@Controller('api')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post('send/text')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a text message' })
  @ApiResponse({ status: 202, description: 'Message queued' })
  async sendText(@Body() dto: SendTextDto) {
    await this.messaging.enqueueText(dto.to, dto.message);
    return { status: 'queued' };
  }

  @Post('send/image')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send an image' })
  async sendImage(@Body() dto: SendImageDto) {
    await this.messaging.enqueueImage(dto.to, dto.base64, dto.mimetype, dto.caption);
    return { status: 'queued' };
  }

  @Post('send/video')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a video' })
  async sendVideo(@Body() dto: SendVideoDto) {
    await this.messaging.enqueueVideo(dto.to, dto.base64, dto.mimetype, dto.caption);
    return { status: 'queued' };
  }

  @Post('send/audio')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send an audio file' })
  async sendAudio(@Body() dto: SendAudioDto) {
    await this.messaging.enqueueAudio(dto.to, dto.base64, dto.mimetype);
    return { status: 'queued' };
  }

  @Post('send/document')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a document' })
  async sendDocument(@Body() dto: SendDocumentDto) {
    await this.messaging.enqueueDocument(
      dto.to,
      dto.base64,
      dto.filename,
      dto.mimetype,
      dto.caption,
    );
    return { status: 'queued' };
  }

  @Post('send/location')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a location' })
  async sendLocation(@Body() dto: SendLocationDto) {
    await this.messaging.enqueueLocation(
      dto.to,
      dto.latitude,
      dto.longitude,
      dto.name,
    );
    return { status: 'queued' };
  }

  @Post('send/contact')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a contact vCard' })
  async sendContact(@Body() dto: SendContactDto) {
    await this.messaging.enqueueContact(dto.to, dto.displayName, dto.vcard);
    return { status: 'queued' };
  }

  @Post('report-issue')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Report an issue - sends formatted .txt to a whitelisted group' })
  @ApiResponse({ status: 202, description: 'Report queued' })
  async reportIssue(@Body() dto: ReportIssueDto) {
    await this.messaging.reportIssue(dto);
    return { status: 'queued' };
  }

  @Get('groups')
  @ApiOperation({ summary: 'List available WhatsApp groups with their JIDs' })
  async getGroups() {
    return this.messaging.getGroups();
  }
}
