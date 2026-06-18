import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('tenant')
  @Roles('tenant_admin', 'operator')
  getTenantStats(@Request() req) {
    return this.statsService.getTenantStats(req.user.tenantId);
  }

  @Get('global')
  @Roles('super_admin')
  getGlobalStats() {
    return this.statsService.getGlobalStats();
  }

  @Get('session/:sessionId')
  @Roles('operator', 'tenant_admin')
  getSessionMetrics(@Param('sessionId') sessionId: string) {
    return this.statsService.getSessionMetrics(sessionId);
  }
}