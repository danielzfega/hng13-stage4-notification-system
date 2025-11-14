// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('API Gateway for Notification Microservices')
    .setVersion('1.0')
    .addBearerAuth()  // optional
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  const port = process.env.API_PORT || 8000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Gateway running on port ${port}`);
}
bootstrap();

