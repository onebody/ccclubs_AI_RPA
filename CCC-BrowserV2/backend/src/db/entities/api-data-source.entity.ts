import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity('api_data_source')
@Index(['tenantId'])
@Index(['deletedAt'])
export class ApiDataSourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @Column({ length: 10, default: 'GET' })
  method: string;

  @Column({ length: 500 })
  url: string;

  @Column({ type: 'jsonb', nullable: true })
  headers: object;

  @Column({ type: 'jsonb', nullable: true })
  params: object;

  @Column({ name: 'data_path', length: 100, default: 'data.list' })
  dataPath: string;

  @Column({ name: 'pagination_config', type: 'jsonb', nullable: true })
  paginationConfig: object;

  @Column({ name: 'batch_size', default: 50 })
  batchSize: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}