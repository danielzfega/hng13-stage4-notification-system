import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private readonly ttl: number;

  constructor(private configService: ConfigService) {
    this.ttl = this.configService.get<number>('REDIS_IDEMPOTENCY_TTL', 86400);
  }

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const db = this.configService.get<number>('REDIS_DB', 0);

    this.client = createClient({
      socket: {
        host,
        port,
      },
      database: db,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis Client Error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  async isProcessed(notificationId: string): Promise<boolean> {
    try {
      const key = `processed:${notificationId}`;
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(
        `Error checking if notification is processed: ${error.message}`,
      );
      return false;
    }
  }

  async markAsProcessed(notificationId: string): Promise<void> {
    try {
      const key = `processed:${notificationId}`;
      await this.client.setEx(key, this.ttl, '1');
      this.logger.debug(
        `Marked notification ${notificationId} as processed with TTL ${this.ttl}s`,
      );
    } catch (error) {
      this.logger.error(
        `Error marking notification as processed: ${error.message}`,
      );
    }
  }

  async cacheUserToken(userId: string, token: string): Promise<void> {
    try {
      const key = `user:token:${userId}`;
      await this.client.setEx(key, 3600, token); // Cache for 1 hour
    } catch (error) {
      this.logger.error(`Error caching user token: ${error.message}`);
    }
  }

  async getCachedUserToken(userId: string): Promise<string | null> {
    try {
      const key = `user:token:${userId}`;
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting cached user token: ${error.message}`);
      return null;
    }
  }

  async incrementFailureCount(key: string): Promise<number> {
    try {
      return await this.client.incr(`failure:${key}`);
    } catch (error) {
      this.logger.error(`Error incrementing failure count: ${error.message}`);
      return 0;
    }
  }

  async resetFailureCount(key: string): Promise<void> {
    try {
      await this.client.del(`failure:${key}`);
    } catch (error) {
      this.logger.error(`Error resetting failure count: ${error.message}`);
    }
  }

  async getFailureCount(key: string): Promise<number> {
    try {
      const count = await this.client.get(`failure:${key}`);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      this.logger.error(`Error getting failure count: ${error.message}`);
      return 0;
    }
  }
}
