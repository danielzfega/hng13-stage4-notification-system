import { Module } from '@nestjs/common';
import { QueueConsumerService } from './queue-consumer.service';
import { FcmModule } from '../fcm/fcm.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [FcmModule, RedisModule],
  providers: [QueueConsumerService],
  exports: [QueueConsumerService],
})
export class QueueModule {}
