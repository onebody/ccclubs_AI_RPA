import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @Roles('super_admin')
  create(@Body() createTenantDto: CreateTenantDto, @Request() req) {
    return this.tenantService.create(createTenantDto, req.user.userId);
  }

  @Get()
  @Roles('super_admin')
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':tenantId')
  @Roles('super_admin', 'tenant_admin')
  findOne(@Param('tenantId') tenantId: string) {
    return this.tenantService.findOne(tenantId);
  }

  @Patch(':tenantId')
  @Roles('super_admin')
  update(@Param('tenantId') tenantId: string, @Body() updateTenantDto: UpdateTenantDto, @Request() req) {
    return this.tenantService.update(tenantId, updateTenantDto, req.user.userId);
  }

  @Delete(':tenantId')
  @Roles('super_admin')
  remove(@Param('tenantId') tenantId: string, @Request() req) {
    return this.tenantService.remove(tenantId, req.user.userId);
  }
}