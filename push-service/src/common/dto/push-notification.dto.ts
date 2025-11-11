import {
  IsString,
  IsUUID,
  IsArray,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { NotificationPriority } from '../enums/notification.enum';

export class PushNotificationDto {
  @IsUUID()
  notification_id: string;

  @IsString()
  user_id: string;

  @IsArray()
  @IsString({ each: true })
  device_tokens: string[];

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsInt()
  @Min(0)
  retries?: number;

  @IsOptional()
  @IsString()
  created_at?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  click_action?: string;
}
