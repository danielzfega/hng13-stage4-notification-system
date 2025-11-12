import { IsEmail, IsNotEmpty, IsString, IsObject, IsUUID } from 'class-validator';

export class SendEmailDto {
  @IsUUID()
  request_id!: string;

  @IsEmail()
  to!: string;

  @IsString()
  subject!: string;

  @IsString()
  template_name!: string;

  @IsObject()
  variables!: Record<string, any>;
}
