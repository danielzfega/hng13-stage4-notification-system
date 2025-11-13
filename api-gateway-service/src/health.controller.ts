import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as amqp from 'amqplib';
import { createClient } from 'redis';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway-service',
      checks: {
        database: await this.checkDatabase(),
        rabbitmq: await this.checkRabbitMQ(),
        redis: await this.checkRedis(),
      },
    };

    const allHealthy = Object.values(health.checks).every(
      (check: any) => check.status === 'up',
    );

    return {
      ...health,
      status: allHealthy ? 'healthy' : 'degraded',
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', message: 'Database connection successful' };
    } catch (error) {
      return {
        status: 'down',
        message: `Database connection failed: ${error.message}`,
      };
    }
  }

  private async checkRabbitMQ() {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      await connection.close();
      return { status: 'up', message: 'RabbitMQ connection successful' };
    } catch (error) {
      return {
        status: 'down',
        message: `RabbitMQ connection failed: ${error.message}`,
      };
    }
  }

  private async checkRedis() {
    try {
      const client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'redis',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });
      await client.connect();
      await client.ping();
      await client.quit();
      return { status: 'up', message: 'Redis connection successful' };
    } catch (error) {
      return {
        status: 'down',
        message: `Redis connection failed: ${error.message}`,
      };
    }
  }

  @Get('ready')
  async readiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
