import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SendNotificationDto } from './dto/send-notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({ status: 201, description: 'Notification routed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  async sendNotification(@Body() body: SendNotificationDto) {
    return this.notificationService.routeNotification(body);
  }
}
