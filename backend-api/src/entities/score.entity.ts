import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Competition } from './competition.entity';
import { Participant } from './participant.entity';
import { User } from './user.entity';

@Entity('scores')
export class Score {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  competitionId: string;

  @Column({ type: 'uuid' })
  participantId: string;

  @Column({ type: 'uuid' })
  judgeId: string;

  @Column({ type: 'varchar', length: 50 })
  round: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  score: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  rank: string;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Competition, competition => competition.scores)
  @JoinColumn({ name: 'competitionId' })
  competition: Competition;

  @ManyToOne(() => Participant, participant => participant.id)
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @ManyToOne(() => User, user => user.judgedScores)
  @JoinColumn({ name: 'judgeId' })
  judge: User;
}
