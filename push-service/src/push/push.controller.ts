import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { QueueConsumerService } from '../queue/queue-consumer.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotificationDto } from '../common/dto/push-notification.dto';
import { v4 as uuidv4 } from 'uuid';

@Controller('push')
export class PushController {
  constructor(
    private queueConsumer: QueueConsumerService,
    private fcmService: FcmService,
  ) {}

  @Post('/test')
  async testPushNotification(@Body() dto: Partial<PushNotificationDto>) {
    const payload = {
      notification_id: dto.notification_id || uuidv4(),
      user_id: dto.user_id || 'test-user',
      device_tokens: dto.device_tokens || [],
      title: dto.title || 'Test Notification',
      body: dto.body || 'This is a test push notification',
      data: dto.data || {},
      priority: dto.priority || 'high',
      retries: 0,
      created_at: new Date().toISOString(),
    };

    await this.queueConsumer.publishTestMessage(payload);

    return {
      success: true,
      message: 'Test push notification queued successfully',
      data: payload,
    };
  }

  @Post('/validate-token')
  async validateToken(@Body() body: { token: string }) {
    const isValid = await this.fcmService.validateToken(body.token);

    return {
      success: true,
      message: isValid ? 'Token is valid' : 'Token is invalid',
      data: {
        token: body.token,
        valid: isValid,
      },
    };
  }
}
