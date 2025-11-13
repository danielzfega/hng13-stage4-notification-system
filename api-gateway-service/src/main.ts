// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Notification System API')
    .setDescription('Distributed Notification System - API Gateway')
    .setVersion('1.0')
    .addTag('notifications', 'Notification management endpoints')
    .addTag('health', 'Health check endpoints')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.API_PORT || 8000;
  await app.listen(port);
  console.log(`🚀 API Gateway running on port ${port}`);
  console.log(`📚 API Documentation available at http://localhost:${port}/api-docs`);
}
bootstrap();
