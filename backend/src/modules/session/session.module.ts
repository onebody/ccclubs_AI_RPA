import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { TenantModule } from '../tenant/tenant.module';
import { BrowserModule } from '../browser/browser.module';

@Module({
  imports: [PrismaModule, AuditModule, TenantModule, BrowserModule],
  providers: [SessionService],
  controllers: [SessionController],
  exports: [SessionService],
})
export class SessionModule {}