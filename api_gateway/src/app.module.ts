import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import rabbitmqConfig from './config/rabbitmq.config';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [rabbitmqConfig] }),
  ],
  controllers: [NotificationsController, HealthController],
  providers: [NotificationsService],
})
export class AppModule {}
