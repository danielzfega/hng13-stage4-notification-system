// src/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class NotificationService {
  private readonly exchange = 'notifications.direct';
  private readonly queues = {
    email: 'email.queue',
    push: 'push.queue',
  };

  async routeNotification(payload: any) {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(this.exchange, 'direct', { durable: true });
    const routingKey = payload.notification_type;

    await channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
    );

    await channel.close();
    await connection.close();

    return {
      success: true,
      message: `Notification routed to ${routingKey} queue`,
      data: payload,
    };
  }
}
