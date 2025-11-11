import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { NotificationStatus } from '../enums/notification.enum';

export class NotificationStatusDto {
  @IsUUID()
  notification_id: string;

  @IsEnum(NotificationStatus)
  status: NotificationStatus;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  delivered_count?: number;

  @IsOptional()
  failed_count?: number;
}
