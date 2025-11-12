import { Controller, Get, Post, Body } from '@nestjs/common';
import { PushService } from './push.service';

@Controller()
export class HealthController {
  constructor(private pushService: PushService) {}

  @Get('/health')
  getHealth() {
    return {
      success: true,
      message: 'Push service is healthy',
      data: this.pushService.getHealth(),
    };
  }

  @Post('/api/v1/push/validate-token')
  async validateToken(@Body() body: { device_token: string }) {
    const isValid = await this.pushService.validateToken(body.device_token);
    return {
      success: true,
      message: isValid ? 'Token is valid' : 'Token is invalid',
      data: { device_token: body.device_token, valid: isValid },
    };
  }

  @Post('/api/v1/push/status')
  async updateStatus(@Body() body: {
    notification_id: string;
    status: 'delivered' | 'pending' | 'failed';
    timestamp?: string;
    error?: string;
  }) {
    this.pushService.updateNotificationStatus(body);
    return {
      success: true,
      message: 'Status updated',
      data: body,
    };
  }
}

