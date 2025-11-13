import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserPreferenceDto {
  @IsBoolean()
  email: boolean;

  @IsBoolean()
  push: boolean;
}

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  push_token?: string;

  @ValidateNested()
  @Type(() => UserPreferenceDto)
  preferences: UserPreferenceDto;

  @IsString()
  @IsNotEmpty()
  password: string;
}
