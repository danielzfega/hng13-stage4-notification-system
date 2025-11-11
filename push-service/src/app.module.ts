import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PushController } from './push/push.controller';
import { QueueModule } from './queue/queue.module';
import { FcmModule } from './fcm/fcm.module';
import { RedisModule } from './redis/redis.module';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    QueueModule,
    FcmModule,
    RedisModule,
    CircuitBreakerModule,
  ],
  controllers: [HealthController, PushController],
})
export class AppModule {}
