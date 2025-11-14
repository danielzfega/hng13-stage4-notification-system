import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('User Service for Notification Microservices')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 8004;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 User Service running on port ${port}`);
  // await app.listen(port, () => Logger.log(`Server listening on port ${port}`));
}
bootstrap();
