import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';

import { TenantRbacModule } from './tenant-rbac/tenant-rbac.module';
import { ProcessConfigModule } from './process-config/process-config.module';
import { TaskQueueModule } from './task-queue/task-queue.module';
import { ApiClientModule } from './api-client/api-client.module';
import { EngineModule } from './engine/engine.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './tenant-rbac/guards/jwt-auth.guard';
import { RolesGuard } from './tenant-rbac/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: configService.get('LOG_LEVEL') === 'debug',
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),

    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          connectTimeout: 5000,
        },
      }),
      inject: [ConfigService],
    }),

    CommonModule,
    TenantRbacModule,
    ProcessConfigModule,
    TaskQueueModule,
    ApiClientModule,
    EngineModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}