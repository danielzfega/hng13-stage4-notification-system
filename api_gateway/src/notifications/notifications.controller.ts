import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendPushDto } from './dto/send-push.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  async sendEmail(@Body() payload: SendEmailDto) {
    const result = await this.notificationsService.sendEmailNotification(payload);
    return { success: true, message: result.message };
  }

  @Post('push')
  async sendPush(@Body() payload: SendPushDto) {
    const result = await this.notificationsService.sendPushNotification(payload);
    return { success: true, message: result.message };
  }
}
