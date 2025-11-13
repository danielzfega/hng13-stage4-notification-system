import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserPreferenceDto {
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @IsBoolean()
  @IsOptional()
  push?: boolean;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  push_token?: string;

  @ValidateNested()
  @Type(() => UpdateUserPreferenceDto)
  @IsOptional()
  preferences?: UpdateUserPreferenceDto;
}
