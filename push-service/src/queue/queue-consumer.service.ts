import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { FcmService } from '../fcm/fcm.service';
import { RedisService } from '../redis/redis.service';
import { PushNotificationPayload } from '../common/interfaces/push-notification.interface';
import { NotificationStatus } from '../common/enums/notification.enum';

@Injectable()
export class QueueConsumerService implements OnModuleInit {
  private readonly logger = new Logger(QueueConsumerService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  private readonly exchange: string;
  private readonly pushQueue: string;
  private readonly failedQueue: string;
  private readonly prefetchCount: number;
  private readonly maxRetryAttempts: number;
  private readonly retryBackoffBase: number;
  private readonly retryBackoffMax: number;

  constructor(
    private configService: ConfigService,
    private fcmService: FcmService,
    private redisService: RedisService,
  ) {
    this.exchange = this.configService.get<string>(
      'RABBITMQ_EXCHANGE',
      'notifications.direct',
    );
    this.pushQueue = this.configService.get<string>(
      'RABBITMQ_PUSH_QUEUE',
      'push.queue',
    );
    this.failedQueue = this.configService.get<string>(
      'RABBITMQ_FAILED_QUEUE',
      'failed.queue',
    );
    this.prefetchCount = this.configService.get<number>(
      'RABBITMQ_PREFETCH_COUNT',
      10,
    );
    this.maxRetryAttempts = this.configService.get<number>(
      'MAX_RETRY_ATTEMPTS',
      3,
    );
    this.retryBackoffBase = this.configService.get<number>(
      'RETRY_BACKOFF_BASE',
      1000,
    );
    this.retryBackoffMax = this.configService.get<number>(
      'RETRY_BACKOFF_MAX',
      30000,
    );
  }

  async onModuleInit() {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');

    if (!rabbitmqUrl) {
      throw new Error('RABBITMQ_URL is not configured');
    }

    this.connection = amqp.connect([rabbitmqUrl]);

    this.connection.on('connect', () => {
      this.logger.log('Connected to RabbitMQ');
    });

    this.connection.on('disconnect', (err) => {
      this.logger.error(`Disconnected from RabbitMQ: ${err?.message}`);
    });

    this.channelWrapper = this.connection.createChannel({
      json: false,
      setup: async (channel) => {
        await channel.assertExchange(this.exchange, 'direct', {
          durable: true,
        });

        await channel.assertQueue(this.pushQueue, {
          durable: true,
        });

        await channel.assertQueue(this.failedQueue, {
          durable: true,
        });

        await channel.bindQueue(this.pushQueue, this.exchange, 'push');

        await channel.prefetch(this.prefetchCount);

        await channel.consume(
          this.pushQueue,
          async (msg) => {
            if (msg) {
              await this.handleMessage(msg);
            }
          },
          { noAck: false },
        );

        this.logger.log(
          `Listening for messages on queue: ${this.pushQueue}`,
        );
      },
    });
  }

  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    let payload: PushNotificationPayload;

    try {
      payload = JSON.parse(msg.content.toString());
      this.logger.log(
        `Received push notification message: ${payload.notification_id}`,
      );

      // Check idempotency
      const isProcessed = await this.redisService.isProcessed(
        payload.notification_id,
      );

      if (isProcessed) {
        this.logger.warn(
          `Notification ${payload.notification_id} already processed (idempotency check)`,
        );
        this.channelWrapper.ack(msg);
        return;
      }

      // Process the notification
      const response = await this.fcmService.sendPushNotification(payload);

      if (response.success) {
        // Mark as processed in Redis
        await this.redisService.markAsProcessed(payload.notification_id);

        // Acknowledge the message
        this.channelWrapper.ack(msg);

        this.logger.log(
          `Successfully processed notification ${payload.notification_id}`,
        );

        // Publish status update (optional - can be sent to a status queue)
        await this.publishStatusUpdate(payload, NotificationStatus.DELIVERED, {
          sent_count: response.sent_count,
          failed_count: response.failed_count,
        });
      } else {
        throw new Error('Push notification failed');
      }
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error.message}`,
        error.stack,
      );

      await this.handleFailure(msg, payload, error);
    }
  }

  private async handleFailure(
    msg: ConsumeMessage,
    payload: PushNotificationPayload,
    error: Error,
  ): Promise<void> {
    const retries = payload?.retries || 0;

    if (retries < this.maxRetryAttempts) {
      const nextRetry = retries + 1;
      const backoffDelay = Math.min(
        this.retryBackoffBase * Math.pow(2, retries),
        this.retryBackoffMax,
      );

      this.logger.warn(
        `Retrying notification ${payload?.notification_id} (attempt ${nextRetry}/${this.maxRetryAttempts}) after ${backoffDelay}ms`,
      );

      // Requeue with updated retry count
      setTimeout(async () => {
        const updatedPayload = {
          ...payload,
          retries: nextRetry,
        };

        await this.channelWrapper.sendToQueue(
          this.pushQueue,
          Buffer.from(JSON.stringify(updatedPayload)),
          { persistent: true },
        );

        this.channelWrapper.ack(msg);
      }, backoffDelay);
    } else {
      this.logger.error(
        `Max retry attempts reached for notification ${payload?.notification_id}. Moving to dead-letter queue.`,
      );

      // Send to failed queue
      await this.channelWrapper.sendToQueue(
        this.failedQueue,
        Buffer.from(
          JSON.stringify({
            ...payload,
            error: error.message,
            failed_at: new Date().toISOString(),
          }),
        ),
        { persistent: true },
      );

      this.channelWrapper.ack(msg);

      // Publish failed status
      await this.publishStatusUpdate(
        payload,
        NotificationStatus.FAILED,
        { error: error.message },
      );
    }
  }

  private async publishStatusUpdate(
    payload: PushNotificationPayload,
    status: NotificationStatus,
    additionalData?: any,
  ): Promise<void> {
    try {
      const statusUpdate = {
        notification_id: payload.notification_id,
        user_id: payload.user_id,
        status,
        timestamp: new Date().toISOString(),
        ...additionalData,
      };

      this.logger.debug(
        `Publishing status update for ${payload.notification_id}: ${status}`,
      );

      // You can publish this to a status queue or send to gateway
      // For now, just logging
    } catch (error) {
      this.logger.error(
        `Error publishing status update: ${error.message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.channelWrapper?.close();
    await this.connection?.close();
    this.logger.log('RabbitMQ connection closed');
  }

  async publishTestMessage(payload: PushNotificationPayload): Promise<void> {
    await this.channelWrapper.sendToQueue(
      this.pushQueue,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
    this.logger.log(`Published test message: ${payload.notification_id}`);
  }
}
