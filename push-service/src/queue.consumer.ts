import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { PushService } from './push.service';

@Injectable()
export class QueueConsumer implements OnModuleInit {
  private readonly logger = new Logger(QueueConsumer.name);
  private connection;
  private channel;

  constructor(
    private config: ConfigService,
    private pushService: PushService,
  ) {}

  async onModuleInit() {
    const url = this.config.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
    const queue = this.config.get('RABBITMQ_PUSH_QUEUE', 'push.queue');
    const failedQueue = this.config.get('RABBITMQ_FAILED_QUEUE', 'failed.queue');
    const maxRetries = this.config.get('MAX_RETRY_ATTEMPTS', 3);

    this.connection = amqp.connect([url]);
    this.connection.on('connect', () => this.logger.log('Connected to RabbitMQ'));

    this.channel = this.connection.createChannel({
      setup: async (channel) => {
        await channel.assertQueue(queue, { durable: true });
        await channel.assertQueue(failedQueue, { durable: true });
        await channel.prefetch(10);

        await channel.consume(queue, async (msg) => {
          if (!msg) return;

          try {
            const payload = JSON.parse(msg.content.toString());
            this.logger.log(`Processing notification ${payload.notification_id}`);

            await this.pushService.sendPush(payload);
            channel.ack(msg);
          } catch (error) {
            this.logger.error(`Error: ${error.message}`);
            
            const payload = JSON.parse(msg.content.toString());
            const retries = payload.retries || 0;

            if (retries < maxRetries) {
              // Retry with exponential backoff
              const delay = Math.min(1000 * Math.pow(2, retries), 30000);
              setTimeout(() => {
                channel.sendToQueue(queue, Buffer.from(JSON.stringify({
                  ...payload,
                  retries: retries + 1,
                })), { persistent: true });
                channel.ack(msg);
              }, delay);
            } else {
              // Send to dead letter queue
              channel.sendToQueue(failedQueue, msg.content, { persistent: true });
              channel.ack(msg);
              this.logger.error(`Max retries reached for ${payload.notification_id}`);
            }
          }
        });

        this.logger.log(`Listening on queue: ${queue}`);
      },
    });
  }
}
