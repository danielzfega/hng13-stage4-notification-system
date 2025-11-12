import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport, ClientProxy } from '@nestjs/microservices';
import { SendEmailDto } from './dto/send-email.dto';
import { SendPushDto } from './dto/send-push.dto';

@Injectable()
export class NotificationsService {
  private emailClient: ClientProxy;
  private pushClient: ClientProxy;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {
    const rabbitUrl = this.configService.get<string>('rabbitmq.url');

    this.emailClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitUrl],
        queue: this.configService.get<string>('rabbitmq.emailQueue'),
        queueOptions: { durable: true },
      },
    });

    this.pushClient = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitUrl],
        queue: this.configService.get<string>('rabbitmq.pushQueue'),
        queueOptions: { durable: true },
      },
    });
  }

  async sendEmailNotification(payload: SendEmailDto) {
    this.logger.log(`Routing email notification for ${payload.to}`);
    await this.emailClient.emit('send_email', payload);
    return { success: true, message: 'Email notification queued' };
  }

  async sendPushNotification(payload: SendPushDto) {
    this.logger.log(`Routing push notification for user ${payload.user_id}`);
    await this.pushClient.emit('send_push', payload);
    return { success: true, message: 'Push notification queued' };
  }
}
