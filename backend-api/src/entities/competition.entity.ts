import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Participant } from './participant.entity';
import { Score } from './score.entity';
import { Announcement } from './announcement.entity';

export enum CompetitionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('competitions')
export class Competition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  @Column({ type: 'int', nullable: true })
  maxParticipants: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  registrationFee: number;

  @Column({
    type: 'enum',
    enum: CompetitionStatus,
    default: CompetitionStatus.DRAFT,
  })
  status: CompetitionStatus;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, tenant => tenant.competitions)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => Participant, participant => participant.competition)
  participants: Participant[];

  @OneToMany(() => Score, score => score.competition)
  scores: Score[];

  @OneToMany(() => Announcement, announcement => announcement.competition)
  announcements: Announcement[];
}
