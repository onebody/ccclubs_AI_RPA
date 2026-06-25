import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskPayload, TaskResult } from './types/task';
import { ProcessTemplateService } from '../process-config/process-template.service';
import { ProcessEntity } from '../db/entities/process.entity';
import { TaskEntity } from '../db/entities/task.entity';
import { ProcessTemplate } from '../process-config/types/process';

@Injectable()
export class TaskConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskConsumerService.name);
  private worker: Worker | null = null;

  constructor(
    private readonly processTemplateService: ProcessTemplateService,
    @InjectRepository(ProcessEntity)
    private readonly processRepository: Repository<ProcessEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
  ) {}

  onModuleInit(): void {
    this.startWorker();
  }

  onModuleDestroy(): void {
    if (this.worker) {
      this.worker.close();
    }
  }

  private startWorker(): void {
    this.worker = new Worker(
      'rpa-tasks',
      async (job) => {
        const payload = job.data as TaskPayload;
        this.logger.log(`Processing task: ${payload.taskId}`);
        return this.processTask(payload, job);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        concurrency: 3,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Task completed: ${job.id}`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Task failed: ${job?.id}, error: ${error.message}`);
    });

    this.worker.on('error', (error) => {
      this.logger.error(`Worker error: ${error.message}`);
    });

    this.logger.log('Task consumer worker started');
  }

  private async processTask(payload: TaskPayload, job: any): Promise<TaskResult> {
    await this.updateTaskStatus(payload.taskId, 'running');

    try {
      const processEntity = await this.processRepository.findOne({
        where: { id: payload.processId, tenantId: payload.tenantId },
      });

      if (!processEntity) {
        await this.updateTaskStatus(payload.taskId, 'failed', { errorMsg: 'Process not found' });
        return { success: false, message: 'Process not found' };
      }

      const template: ProcessTemplate = {
        processName: processEntity.name,
        delayMode: processEntity.delayMode as any,
        sessionCacheEnable: processEntity.sessionCacheEnable,
        sessionCacheTtl: processEntity.sessionTtl,
        loginBlock: processEntity.loginConfig as any,
        sceneList: processEntity.sceneList as any,
      };

      const validationErrors = this.processTemplateService.validate(template);
      if (validationErrors.length > 0) {
        await this.updateTaskStatus(payload.taskId, 'failed', { errorMsg: validationErrors.join('; ') });
        return { success: false, message: validationErrors.join('; ') };
      }

      const result = await this.processTemplateService.execute(
        template,
        payload.userDataList,
        payload.tenantId,
        payload.processId,
        payload.sessionId,
      );

      if (result.success) {
        await this.updateTaskStatus(payload.taskId, 'success', {
          result: result.sceneResults,
          progress: 100,
        });
        return { success: true, message: 'Task completed successfully', data: result.sceneResults };
      } else {
        await this.updateTaskStatus(payload.taskId, 'failed', {
          errorMsg: result.message,
          result: result.sceneResults,
        });
        return { success: false, message: result.message, error: result.error?.message };
      }
    } catch (error) {
      this.logger.error(`Task processing error: ${error.message}`);
      await this.updateTaskStatus(payload.taskId, 'failed', { errorMsg: error.message });
      return { success: false, message: error.message, error: error.message };
    }
  }

  private async updateTaskStatus(
    taskId: string,
    status: string,
    updates?: Partial<TaskEntity>,
  ): Promise<void> {
    try {
      await this.taskRepository.update(taskId, {
        status,
        startTime: status === 'running' ? new Date() : undefined,
        endTime: ['success', 'failed', 'cancelled'].includes(status) ? new Date() : undefined,
        ...updates,
      });
    } catch (error) {
      this.logger.error(`Failed to update task status: ${error.message}`);
    }
  }

  async getWorkerStats(): Promise<any> {
    if (!this.worker) {
      return null;
    }
    return {
      workerStatus: 'running',
    };
  }
}