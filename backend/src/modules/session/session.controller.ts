import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('session')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('create')
  @Roles('operator')
  create(@Body() createSessionDto: CreateSessionDto, @Request() req) {
    return this.sessionService.create(createSessionDto, req.user.tenantId, req.user.userId);
  }

  @Post(':sessionId/close')
  @Roles('operator')
  close(@Param('sessionId') sessionId: string, @Request() req) {
    return this.sessionService.destroy(sessionId, 'manual', req.user.userId);
  }

  @Get(':sessionId')
  @Roles('operator', 'readonly', 'tenant_admin')
  findOne(@Param('sessionId') sessionId: string) {
    return this.sessionService.findOne(sessionId);
  }

  @Get(':sessionId/status')
  @Roles('operator', 'readonly', 'tenant_admin')
  getStatus(@Param('sessionId') sessionId: string) {
    return this.sessionService.getStatus(sessionId);
  }

  @Get()
  @Roles('tenant_admin', 'operator')
  findAll(@Request() req) {
    return this.sessionService.findAll(req.user.tenantId);
  }
}