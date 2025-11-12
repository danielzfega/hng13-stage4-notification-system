import { IsNotEmpty, IsString, IsObject, IsUUID } from 'class-validator';

export class SendPushDto {
  @IsUUID()
  request_id!: string;

  @IsString()
  user_id!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsObject()
  data?: Record<string, any>;
}
