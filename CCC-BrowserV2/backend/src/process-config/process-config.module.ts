import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngineModule } from '../engine/engine.module';
import { ProcessEntity } from '../db/entities/process.entity';
import { ProcessTemplateService } from './process-template.service';
import { BlockExecutorService } from './block-executor.service';
import { FieldMapperService } from './field-mapper.service';
import { RetryStrategyService } from './retry-strategy.service';
import { ProcessConfigController } from './controllers/process-config.controller';

@Module({
  imports: [EngineModule, TypeOrmModule.forFeature([ProcessEntity])],
  controllers: [ProcessConfigController],
  providers: [
    ProcessTemplateService,
    BlockExecutorService,
    FieldMapperService,
    RetryStrategyService,
  ],
  exports: [
    ProcessTemplateService,
    BlockExecutorService,
    FieldMapperService,
    RetryStrategyService,
  ],
})
export class ProcessConfigModule {}