import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './modules/tenant/tenant.module';
import { SessionModule } from './modules/session/session.module';
import { TaskModule } from './modules/task/task.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { AiModule } from './modules/ai/ai.module';
import { ScriptModule } from './modules/script/script.module';
import { StatsModule } from './modules/stats/stats.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SocketGateway } from './modules/socket/socket.gateway';
import { BrowserModule } from './modules/browser/browser.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TenantModule,
    SessionModule,
    TaskModule,
    AuditModule,
    AiModule,
    ScriptModule,
    StatsModule,
    BrowserModule,
  ],
  providers: [SocketGateway],
})
export class AppModule {}