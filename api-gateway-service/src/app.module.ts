// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { NotificationModule } from './notification/notification.module';
import { PrismaService } from './prisma/prisma.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
