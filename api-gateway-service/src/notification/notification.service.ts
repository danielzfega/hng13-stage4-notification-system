// src/notification/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { createClient } from 'redis';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationStatus } from './dto/notification-status.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly exchange = 'notifications.direct';
  private readonly queues = {
    email: 'email.queue',
    push: 'push.queue',
  };
  private redisClient;

  constructor(private readonly prisma: PrismaService) {
    this.initializeRedis();
  }

  private async initializeRedis() {
    this.redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });
    
    this.redisClient.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });

    await this.redisClient.connect();
  }

  async routeNotification(payload: CreateNotificationDto) {
    // Check idempotency
    const isDuplicate = await this.checkIdempotency(payload.request_id);
    if (isDuplicate) {
      this.logger.warn(`Duplicate request detected: ${payload.request_id}`);
      return {
        request_id: payload.request_id,
        status: 'duplicate',
        message: 'Request already processed',
      };
    }

        // Create notification record
    const notification = await this.createNotificationRecord(payload);

    // Fetch user email for email notifications by calling user service
    let userEmail = null;
    if (payload.notification_type === 'email') {
      try {
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:8004';
        const response = await fetch(`${userServiceUrl}/users/${payload.user_id}`);
        if (!response.ok) {
          throw new Error(`User not found: ${payload.user_id}`);
        }
        const userData = await response.json();
        const user = userData.data || userData;
        userEmail = user.email;
        // Add user name to variables if not present
        if (!payload.variables.name && user.name) {
          payload.variables.name = user.name;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch user email: ${error.message}`);
        throw error;
      }
    }

    // Publish to RabbitMQ
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(this.exchange, 'direct', { durable: true });
    const routingKey = payload.notification_type;

    const message: any = {
      request_id: payload.request_id,
      notification_id: notification.id,
      notification_type: payload.notification_type,
      user_id: payload.user_id,
      template_code: payload.template_code,
      template_name: payload.template_code,  // alias for email service
      variables: payload.variables,
      metadata: payload.metadata,
      timestamp: new Date().toISOString(),
    };

    // Add email for email notifications
    if (userEmail) {
      message.to = userEmail;
    }

    await channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );

    await channel.close();
    await connection.close();

    // Mark request as processed
    await this.markRequestProcessed(payload.request_id);

    this.logger.log(`Notification ${notification.id} routed to ${routingKey} queue`);

    return {
      notification_id: notification.id,
      request_id: payload.request_id,
      status: NotificationStatus.PENDING,
      message: `Notification queued to ${routingKey}`,
    };
  }

  async getNotificationStatus(requestId: string) {
    const notification = await this.prisma.notificationStatus.findUnique({
      where: { request_id: requestId },
    });

    if (!notification) {
      return {
        request_id: requestId,
        status: 'not_found',
        message: 'Notification not found',
      };
    }

    return {
      notification_id: notification.id,
      request_id: notification.request_id,
      status: notification.status,
      type: notification.type,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
      error: notification.error,
    };
  }

  private async checkIdempotency(requestId: string): Promise<boolean> {
    try {
      const exists = await this.redisClient.get(`idempotency:${requestId}`);
      return exists !== null;
    } catch (error) {
      this.logger.error('Idempotency check failed', error);
      return false;
    }
  }

  private async markRequestProcessed(requestId: string): Promise<void> {
    try {
      // Store for 24 hours
      await this.redisClient.setEx(`idempotency:${requestId}`, 86400, 'processed');
    } catch (error) {
      this.logger.error('Failed to mark request as processed', error);
    }
  }

  private async createNotificationRecord(payload: CreateNotificationDto) {
    return this.prisma.notificationStatus.create({
      data: {
        request_id: payload.request_id,
        status: NotificationStatus.PENDING,
        type: payload.notification_type,
        user_id: payload.user_id,
        metadata: payload.metadata || {},
      },
    });
  }
}
