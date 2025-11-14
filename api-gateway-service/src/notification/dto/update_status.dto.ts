import { ApiProperty } from '@nestjs/swagger';
import { NotificationStatus } from './notifications.enums';

export class UpdateNotificationStatusDto {
  @ApiProperty({ example: "notif_abcdef123456" })
  notification_id: string;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty({
    required: false,
    example: "2025-11-14T12:30:00Z",
    description: "Timestamp of the status update"
  })
  timestamp?: string;

  @ApiProperty({
    required: false,
    example: "SMTP server timeout",
    description: "Use only when status = failed"
  })
  error?: string;
}
