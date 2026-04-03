import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendTextDto {
  @ApiProperty({ description: 'Phone number (with country code) or group JID' })
  to!: string;

  @ApiProperty({ description: 'Text message content' })
  message!: string;
}

export class SendImageDto {
  @ApiProperty({ description: 'Phone number or group JID' })
  to!: string;

  @ApiProperty({ description: 'Base64 encoded image' })
  base64!: string;

  @ApiPropertyOptional({ description: 'Image MIME type', default: 'image/jpeg' })
  mimetype?: string;

  @ApiPropertyOptional({ description: 'Caption for the image' })
  caption?: string;
}

export class SendVideoDto {
  @ApiProperty({ description: 'Phone number or group JID' })
  to!: string;

  @ApiProperty({ description: 'Base64 encoded video' })
  base64!: string;

  @ApiPropertyOptional({ description: 'Video MIME type', default: 'video/mp4' })
  mimetype?: string;

  @ApiPropertyOptional({ description: 'Caption for the video' })
  caption?: string;
}

export class SendAudioDto {
  @ApiProperty({ description: 'Phone number or group JID' })
  to!: string;

  @ApiProperty({ description: 'Base64 encoded audio' })
  base64!: string;

  @ApiPropertyOptional({ description: 'Audio MIME type', default: 'audio/mpeg' })
  mimetype?: string;
}

export class SendDocumentDto {
  @ApiProperty({ description: 'Phone number or group JID' })
  to!: string;

  @ApiProperty({ description: 'Base64 encoded document' })
  base64!: string;

  @ApiProperty({ description: 'Filename with extension' })
  filename!: string;

  @ApiPropertyOptional({ description: 'Document MIME type' })
  mimetype?: string;

  @ApiPropertyOptional({ description: 'Caption for the document' })
  caption?: string;
}

export class SendLocationDto {
  @ApiProperty({ description: 'Phone number or group JID' })
  to!: string;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiPropertyOptional({ description: 'Location name' })
  name?: string;
}

export class SendContactDto {
  @ApiProperty({ description: 'Phone number or group JID' })
  to!: string;

  @ApiProperty({ description: 'Display name of the contact' })
  displayName!: string;

  @ApiProperty({ description: 'vCard string' })
  vcard!: string;
}
