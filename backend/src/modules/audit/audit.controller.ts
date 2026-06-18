import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles('tenant_admin', 'super_admin')
  findByTenant(@Request() req, @Query() params: {
    actionType?: string;
    startTime?: string;
    endTime?: string;
  }) {
    return this.auditService.findByTenant(req.user.tenantId, {
      actionType: params.actionType,
      startTime: params.startTime ? new Date(params.startTime) : undefined,
      endTime: params.endTime ? new Date(params.endTime) : undefined,
    });
  }

  @Get('logs/session/:sessionId')
  @Roles('tenant_admin', 'operator')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.auditService.findBySession(sessionId);
  }
}