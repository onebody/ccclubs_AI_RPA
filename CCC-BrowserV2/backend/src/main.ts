import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS配置(仅本地)
  app.enableCors({
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
  });

  // API前缀
  app.setGlobalPrefix('api/v1');

  // Swagger API文档
  const config = new DocumentBuilder()
    .setTitle('RPA自动化系统API')
    .setDescription('极简配置驱动RPA自动化系统后端API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('tenants', '租户管理')
    .addTag('processes', '流程模板管理')
    .addTag('api-sources', 'API数据源管理')
    .addTag('tasks', '任务调度管理')
    .addTag('auth', '认证授权')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 仅本地监听(安全约束)
  const host = process.env.HOST || '127.0.0.1';
  const port = process.env.PORT || 3000;
  await app.listen(port, host);

  logger.log(`🚀 RPA后端服务已启动: http://${host}:${port}`);
  logger.log(`📚 API文档地址: http://${host}:${port}/api`);
}

bootstrap();