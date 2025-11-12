import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()

  healthCheck() {
    return { success: true, message: 'API Gateway is healthy' };
  }
}

