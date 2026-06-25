import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { UserEntity } from '../../db/entities/user.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() user: Partial<UserEntity>): Promise<UserEntity> {
    return this.userService.create(user);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<UserEntity | null> {
    return this.userService.findById(id);
  }

  @Get('tenant/:tenantId')
  async findByTenant(@Param('tenantId') tenantId: string): Promise<UserEntity[]> {
    return this.userService.findByTenant(tenantId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updates: Partial<UserEntity>): Promise<UserEntity | null> {
    return this.userService.update(id, updates);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.userService.delete(id);
    return { success };
  }
}