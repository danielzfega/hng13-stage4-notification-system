import { Controller, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';

import { SendNotificationDto } from './dto/send_notification.dto';
import { UpdateNotificationStatusDto } from './dto/update_status.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor() {}

  @Post()
  @ApiBody({ type: SendNotificationDto })
  async sendNotification(@Body() body: SendNotificationDto) {
    return {
      success: true,
      received: body,
    };
  }

  @Patch(':notification_preference/status')
  @ApiBody({ type: UpdateNotificationStatusDto })
  async updateStatus(
    @Body() body: UpdateNotificationStatusDto,
    @Param('notification_preference') preference: string,
  ) {
    return {
      success: true,
      preference,
      body,
    };
  }
}
