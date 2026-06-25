import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tenant')
@Index(['status'])
@Index(['expireTime'])
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, default: 'active' })
  status: string; // active/suspended/expired

  @Column({ name: 'concurrent_limit', default: 5 })
  concurrentLimit: number;

  @Column({ name: 'expire_time', type: 'timestamp', nullable: true })
  expireTime: Date;

  @Column({ name: 'api_token', length: 255, nullable: true })
  apiToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}