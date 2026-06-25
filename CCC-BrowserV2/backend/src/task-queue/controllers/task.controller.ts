import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../../db/entities/task.entity';
import { JwtAuthGuard } from '../../tenant-rbac/guards/jwt-auth.guard';
import { TaskProducerService } from '../task-producer.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly taskProducer: TaskProducerService,
  ) {}

  @Get()
  async getAll(@Req() req: any) {
    const tenantId = req.tenantId;
    return this.taskRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId;
    return this.taskRepository.findOne({
      where: { id, tenantId },
    });
  }

  @Post()
  async create(@Body() data: any, @Req() req: any) {
    const tenantId = req.tenantId;
    const task = this.taskRepository.create({
      ...data,
      tenantId,
      status: 'pending',
      progress: 0,
    });
    const savedTask = await this.taskRepository.save(task);
    return savedTask;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const tenantId = req.tenantId;
    await this.taskRepository.update(
      { id, tenantId },
      { ...data },
    );
    return this.taskRepository.findOne({
      where: { id, tenantId },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId;
    await this.taskRepository.delete({ id, tenantId });
    return { success: true };
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId;
    const task = await this.taskRepository.findOne({
      where: { id, tenantId },
    });
    
    if (!task) {
      return { success: false, message: 'Task not found' };
    }

    await this.taskProducer.addTask({
      taskId: task.id,
      tenantId: task.tenantId,
      processId: task.processId,
      sceneId: task.sceneId,
      apiSourceId: task.apiSourceId,
      userDataList: Array.isArray(task.taskData) ? task.taskData : [],
    });

    await this.taskRepository.update(id, { status: 'running' });
    return { success: true, message: 'Task added to queue' };
  }
}