import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用CORS
  app.enableCors({
    origin: [
      'http://localhost:5179',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // 允许携带凭证
  });

  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 设置全局前缀
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;

  await app.listen(port);
  console.log(`API Agent is running on: http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
}
bootstrap();
