import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { PermissionEntity } from '../../db/entities/permission.entity';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  async create(@Body() permission: Partial<PermissionEntity>): Promise<PermissionEntity> {
    return this.permissionService.create(permission);
  }

  @Get()
  async findAll(): Promise<PermissionEntity[]> {
    return this.permissionService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<PermissionEntity | null> {
    return this.permissionService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updates: Partial<PermissionEntity>): Promise<PermissionEntity | null> {
    return this.permissionService.update(id, updates);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.permissionService.delete(id);
    return { success };
  }
}