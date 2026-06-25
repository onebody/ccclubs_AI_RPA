import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { TaskEntity } from '../db/entities/task.entity';
import { TaskStatus } from './types/task';

@Injectable()
export class TaskStatusService {
  private readonly logger = new Logger(TaskStatusService.name);

  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
  ) {}

  async getTask(taskId: string): Promise<TaskEntity | null> {
    return this.taskRepository.findOne({ where: { id: taskId } });
  }

  async getTasksByTenant(tenantId: string, status?: TaskStatus, page = 1, pageSize = 20): Promise<{ data: TaskEntity[]; total: number }> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .where('task.tenantId = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    queryBuilder.orderBy('task.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async getTasksByProcess(processId: string, page = 1, pageSize = 20): Promise<{ data: TaskEntity[]; total: number }> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .where('task.processId = :processId', { processId })
      .orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async updateTask(taskId: string, updates: Partial<TaskEntity>): Promise<void> {
    await this.taskRepository.update(taskId, updates);
    this.logger.log(`Task updated: ${taskId}`);
  }

  async updateStatus(taskId: string, status: TaskStatus): Promise<void> {
    const updates: Partial<TaskEntity> = {
      status,
    };

    if (status === 'running') {
      updates.startTime = new Date();
    } else if (['success', 'failed', 'cancelled'].includes(status)) {
      updates.endTime = new Date();
    }

    await this.taskRepository.update(taskId, updates);
    this.logger.log(`Task status updated: ${taskId} -> ${status}`);
  }

  async updateProgress(taskId: string, progress: number): Promise<void> {
    await this.taskRepository.update(taskId, { progress });
  }

  async updateResult(taskId: string, result: object): Promise<void> {
    await this.taskRepository.update(taskId, { result, status: 'success', endTime: new Date(), progress: 100 });
  }

  async updateError(taskId: string, errorMsg: string): Promise<void> {
    await this.taskRepository.update(taskId, { errorMsg, status: 'failed', endTime: new Date() });
  }

  async incrementRetryCount(taskId: string): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (task) {
      await this.taskRepository.update(taskId, { retryCount: task.retryCount + 1 });
    }
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      return false;
    }
    if (task.status !== 'pending') {
      return false;
    }
    await this.taskRepository.update(taskId, { status: 'cancelled' as TaskStatus, endTime: new Date() });
    this.logger.log(`Task cancelled: ${taskId}`);
    return true;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      return false;
    }
    await this.taskRepository.delete(taskId);
    this.logger.log(`Task deleted: ${taskId}`);
    return true;
  }

  async getTaskStats(tenantId: string): Promise<{ total: number; pending: number; running: number; success: number; failed: number; cancelled: number }> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .where('task.tenantId = :tenantId', { tenantId });

    const [total, pending, running, success, failed, cancelled] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('task.status = :status', { status: 'pending' }).getCount(),
      queryBuilder.clone().andWhere('task.status = :status', { status: 'running' }).getCount(),
      queryBuilder.clone().andWhere('task.status = :status', { status: 'success' }).getCount(),
      queryBuilder.clone().andWhere('task.status = :status', { status: 'failed' }).getCount(),
      queryBuilder.clone().andWhere('task.status = :status', { status: 'cancelled' }).getCount(),
    ]);

    return { total, pending, running, success, failed, cancelled };
  }

  async createTask(task: Omit<TaskEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskEntity> {
    const newTask = this.taskRepository.create(task);
    return this.taskRepository.save(newTask);
  }
}