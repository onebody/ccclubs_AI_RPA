import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { RoleEntity } from '../../db/entities/role.entity';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  async create(@Body() role: Partial<RoleEntity>): Promise<RoleEntity> {
    return this.roleService.create(role);
  }

  @Get()
  async findAll(): Promise<RoleEntity[]> {
    return this.roleService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<RoleEntity | null> {
    return this.roleService.findById(id);
  }

  @Get('tenant/:tenantId')
  async findByTenant(@Param('tenantId') tenantId: string): Promise<RoleEntity[]> {
    return this.roleService.findByTenant(tenantId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updates: Partial<RoleEntity>): Promise<RoleEntity | null> {
    return this.roleService.update(id, updates);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.roleService.delete(id);
    return { success };
  }
}