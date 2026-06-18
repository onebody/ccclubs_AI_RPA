import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../session/session.service';
import { CreateTaskDto } from './dto/create-task.dto';
import * as crypto from 'crypto';

export type TaskType = 'script' | 'ai';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private sessionService: SessionService,
  ) {}

  async create(createTaskDto: CreateTaskDto, tenantId: string, operatorId: string) {
    const session = await this.sessionService.findOne(createTaskDto.sessionId);
    if (session.tenantId !== tenantId) {
      throw new NotFoundException('会话不属于当前租户');
    }

    const taskId = crypto.randomUUID();

    const task = await this.prisma.taskRecord.create({
      data: {
        taskId,
        sessionId: createTaskDto.sessionId,
        taskType: createTaskDto.taskType,
        status: 'pending',
      },
    });

    await this.auditService.createLog({
      operatorId,
      tenantId,
      sessionId: createTaskDto.sessionId,
      actionType: 'TASK_CREATE',
      details: { taskType: createTaskDto.taskType },
    });

    this.executeTask(taskId, createTaskDto);

    return task;
  }

  private async executeTask(taskId: string, createTaskDto: CreateTaskDto) {
    await this.prisma.taskRecord.update({
      where: { taskId },
      data: { status: 'running' },
    });

    const startTime = Date.now();

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 5000));

      const resultPath = `/tmp/task-results/${taskId}.json`;

      await this.prisma.taskRecord.update({
        where: { taskId },
        data: {
          status: 'success',
          duration: Date.now() - startTime,
          resultPath,
        },
      });
    } catch (error) {
      await this.prisma.taskRecord.update({
        where: { taskId },
        data: {
          status: 'failed',
          duration: Date.now() - startTime,
        },
      });
    }
  }

  async findOne(taskId: string) {
    const task = await this.prisma.taskRecord.findUnique({
      where: { taskId },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    return task;
  }

  async findBySession(sessionId: string) {
    return this.prisma.taskRecord.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.taskRecord.findMany({
      where: {
        session: { tenantId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}