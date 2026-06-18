import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

@Entity('user_tenants')
@Unique(['userId', 'tenantId'])
export class UserTenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.userTenants)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Tenant, tenant => tenant.userTenants)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
