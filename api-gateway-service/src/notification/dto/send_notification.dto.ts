import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from './notification.enums';
import { UserDataDto } from './user-data.dto';

export class SendNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.EMAIL })
  notification_type: NotificationType;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  user_id: string;

  @ApiProperty({
    example: "WELCOME_EMAIL",
    description: "Template code or template file path"
  })
  template_code: string;

  @ApiProperty({ type: UserDataDto })
  variables: UserDataDto;

  @ApiProperty({ example: "req_129827asdb7129" })
  request_id: string;

  @ApiProperty({ example: 1 })
  priority: number;

  @ApiProperty({ required: false, example: { device: "ios" } })
  metadata?: Record<string, any>;
}
