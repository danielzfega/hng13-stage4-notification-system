import { Controller, Get } from '@nestjs/common';
import { PushService } from './push.service';

@Controller()
export class HealthController {
  constructor(private pushService: PushService) {}

  @Get('/health')
  getHealth() {
    return {
      success: true,
      data: this.pushService.getHealth(),
    };
  }
}
