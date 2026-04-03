import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecentRequestDto {
  @ApiProperty({ description: 'HTTP method' })
  method!: string;

  @ApiProperty({ description: 'Request URL/path' })
  url!: string;

  @ApiPropertyOptional({ description: 'HTTP status code' })
  statusCode?: number;

  @ApiPropertyOptional({ description: 'ISO timestamp of the request' })
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Request body (summary)' })
  body?: any;

  @ApiPropertyOptional({ description: 'Response body (summary)' })
  response?: any;

  @ApiPropertyOptional({ description: 'Duration in ms' })
  durationMs?: number;
}

export class ReportIssueDto {
  @ApiProperty({ description: 'Group JID to send the report to' })
  groupJid!: string;

  @ApiProperty({ description: 'Description of the issue' })
  description!: string;

  @ApiPropertyOptional({ description: 'User identifier (email, ID, etc.)' })
  userId?: string;

  @ApiPropertyOptional({ description: 'App name or origin' })
  appName?: string;

  @ApiPropertyOptional({ description: 'Last 15 requests for context', type: [RecentRequestDto] })
  recentRequests?: RecentRequestDto[];
}
