import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles('operator')
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.taskService.create(createTaskDto, req.user.tenantId, req.user.userId);
  }

  @Get(':taskId')
  @Roles('operator', 'readonly', 'tenant_admin')
  findOne(@Param('taskId') taskId: string) {
    return this.taskService.findOne(taskId);
  }

  @Get('session/:sessionId')
  @Roles('operator', 'readonly', 'tenant_admin')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.taskService.findBySession(sessionId);
  }

  @Get()
  @Roles('tenant_admin', 'operator')
  findByTenant(@Request() req) {
    return this.taskService.findByTenant(req.user.tenantId);
  }
}