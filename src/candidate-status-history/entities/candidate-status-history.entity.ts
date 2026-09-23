import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { User } from '../../user/entities/user.entity';
import { CandidateStatus } from '../../lib/enums/candidate.enum';

@Entity('candidate_status_history')
export class CandidateStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CandidateStatus })
  status: CandidateStatus;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column()
  candidateId: number;

  @ManyToOne(() => Candidate, (candidate) => candidate.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @Column({ nullable: true })
  adminId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
