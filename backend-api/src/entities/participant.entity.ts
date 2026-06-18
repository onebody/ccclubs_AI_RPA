import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Competition } from './competition.entity';
import { User } from './user.entity';

export enum ParticipantStatus {
  REGISTERED = 'registered',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHECKED_IN = 'checked_in',
  WITHDRAWN = 'withdrawn',
}

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  competitionId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  participantNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  teamName: string;

  @Column({ type: 'jsonb', nullable: true })
  registrationData: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.REGISTERED,
  })
  status: ParticipantStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;

  @CreateDateColumn()
  registeredAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Competition, competition => competition.participants)
  @JoinColumn({ name: 'competitionId' })
  competition: Competition;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;
}
