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

@Entity('rpa_process')
@Index(['tenantId'])
@Index(['status'])
@Index(['deletedAt'])
export class ProcessEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'session_cache_enable', default: true })
  sessionCacheEnable: boolean;

  @Column({ name: 'session_ttl', default: 3600 })
  sessionTtl: number;

  @Column({ name: 'delay_mode', length: 20, default: 'balance' })
  delayMode: string;

  @Column({ name: 'login_config', type: 'jsonb', nullable: true })
  loginConfig: object;

  @Column({ name: 'scene_list', type: 'jsonb', nullable: true })
  sceneList: object[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}