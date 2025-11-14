import { ApiProperty } from '@nestjs/swagger';

export class UserDataDto {
  @ApiProperty({ example: "John Doe" })
  name: string;

  @ApiProperty({ example: "https://myapp.com/verify/abc123" })
  link: string;

  @ApiProperty({ required: false, example: { ip: "127.0.0.1" } })
  meta?: Record<string, any>;
}
