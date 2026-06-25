import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { TaskPayload, TaskOptions } from './types/task';

@Injectable()
export class TaskProducerService {
  private readonly logger = new Logger(TaskProducerService.name);
  private readonly taskQueue: Queue;

  constructor() {
    this.taskQueue = new Queue('rpa-tasks', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 86400,
        },
        removeOnFail: {
          age: 86400,
        },
      },
    });
  }

  async addTask(payload: TaskPayload, options?: TaskOptions): Promise<string> {
    const job = await this.taskQueue.add('rpa-task', payload, {
      priority: options?.priority || 0,
      delay: options?.delay,
      attempts: options?.attempts || 3,
      backoff: options?.backoff || {
        type: 'exponential' as const,
        delay: 1000,
      },
      jobId: payload.taskId,
    });

    this.logger.log(`Task added to queue: ${job.id}`);
    return job.id || payload.taskId;
  }

  async addTasks(payloads: TaskPayload[], options?: TaskOptions): Promise<string[]> {
    const jobs = await Promise.all(
      payloads.map((payload) => this.addTask(payload, options)),
    );
    this.logger.log(`Batch added ${jobs.length} tasks to queue`);
    return jobs;
  }

  async getTaskStatus(taskId: string): Promise<any> {
    const job = await this.taskQueue.getJob(taskId);
    if (!job) {
      return null;
    }
    return {
      id: job.id,
      status: await job.getState(),
      progress: (job as any).progress(),
    };
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const job = await this.taskQueue.getJob(taskId);
    if (!job) {
      return false;
    }
    await job.remove();
    this.logger.log(`Task cancelled: ${taskId}`);
    return true;
  }

  async getQueueStats(): Promise<any> {
    const stats = await this.taskQueue.getJobs(['completed', 'failed', 'delayed', 'waiting', 'active']);
    const results: Record<string, number> = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
    for (const job of stats) {
      const state = await job.getState();
      results[state] = (results[state] || 0) + 1;
    }
    return results;
  }

  async pauseQueue(): Promise<void> {
    await this.taskQueue.pause();
    this.logger.log('Queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.taskQueue.resume();
    this.logger.log('Queue resumed');
  }

  async drainQueue(): Promise<void> {
    await this.taskQueue.drain();
    this.logger.log('Queue drained');
  }
}