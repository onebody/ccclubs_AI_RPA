import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessConfigModule } from '../process-config/process-config.module';
import { TaskProducerService } from './task-producer.service';
import { TaskConsumerService } from './task-consumer.service';
import { TaskStatusService } from './task-status.service';
import { ProcessEntity } from '../db/entities/process.entity';
import { TaskEntity } from '../db/entities/task.entity';
import { TaskController } from './controllers/task.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcessEntity, TaskEntity]),
    ProcessConfigModule,
  ],
  controllers: [TaskController],
  providers: [
    TaskProducerService,
    TaskConsumerService,
    TaskStatusService,
  ],
  exports: [
    TaskProducerService,
    TaskConsumerService,
    TaskStatusService,
  ],
})
export class TaskQueueModule {}