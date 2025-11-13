import { IsString, IsEnum, IsUUID, IsObject, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from './notification-status.dto';

export class CreateNotificationDto {
  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification to send',
    example: NotificationType.EMAIL
  })
  @IsEnum(NotificationType)
  notification_type: NotificationType;

  @ApiProperty({
    description: 'UUID of the user to send notification to',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Template code/identifier for the notification',
    example: 'welcome'
  })
  @IsString()
  template_code: string;

  @ApiProperty({
    description: 'Variables to be used in template rendering',
    example: { name: 'John Doe', link: 'https://example.com/verify' }
  })
  @IsObject()
  variables: Record<string, any>;

  @ApiProperty({
    description: 'Unique identifier for this request (for idempotency)',
    example: 'req-12345-abcde'
  })
  @IsString()
  request_id: string;

  @ApiProperty({
    description: 'Priority level (1-10, higher is more urgent)',
    example: 5,
    minimum: 1,
    maximum: 10,
    required: false
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number = 5;

  @ApiProperty({
    description: 'Additional metadata for the notification',
    example: { campaign_id: 'summer-2024' },
    required: false
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
