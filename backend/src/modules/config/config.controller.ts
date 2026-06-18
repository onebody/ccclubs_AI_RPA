import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('proxy')
  @Roles('super_admin')
  getProxyConfig() {
    return this.configService.getProxyConfig();
  }

  @Get('security')
  @Roles('super_admin')
  getSecurityConfig() {
    return this.configService.getSecurityConfig();
  }

  @Get('performance')
  @Roles('super_admin')
  getPerformanceConfig() {
    return this.configService.getPerformanceConfig();
  }
}