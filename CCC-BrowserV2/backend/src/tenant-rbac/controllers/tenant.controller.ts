import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { TenantEntity } from '../../db/entities/tenant.entity';
import { Public } from '../decorators/public.decorator';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Post()
  async create(@Body() tenant: Partial<TenantEntity>): Promise<TenantEntity> {
    return this.tenantService.create(tenant);
  }

  @Get()
  async findAll(): Promise<TenantEntity[]> {
    return this.tenantService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<TenantEntity | null> {
    return this.tenantService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updates: Partial<TenantEntity>): Promise<TenantEntity | null> {
    return this.tenantService.update(id, updates);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.tenantService.delete(id);
    return { success };
  }
}