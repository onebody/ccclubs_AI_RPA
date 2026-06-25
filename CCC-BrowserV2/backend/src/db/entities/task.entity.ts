import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { ProcessEntity } from './process.entity';
import { ApiDataSourceEntity } from './api-data-source.entity';

@Entity('rpa_task')
@Index(['tenantId'])
@Index(['status'])
@Index(['processId'])
@Index(['createdAt'])
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @Column({ name: 'process_id' })
  processId: string;

  @ManyToOne(() => ProcessEntity)
  @JoinColumn({ name: 'process_id' })
  process: ProcessEntity;

  @Column({ name: 'scene_id', length: 50, nullable: true })
  sceneId: string;

  @Column({ name: 'api_source_id', nullable: true })
  apiSourceId: string;

  @ManyToOne(() => ApiDataSourceEntity)
  @JoinColumn({ name: 'api_source_id' })
  apiSource: ApiDataSourceEntity;

  @Column({ name: 'task_data', type: 'jsonb', nullable: true })
  taskData: object;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ type: 'jsonb', nullable: true })
  result: object;

  @Column({ name: 'error_msg', type: 'text', nullable: true })
  errorMsg: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}