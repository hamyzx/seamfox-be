import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Crossword } from './crossword.entity';

@Entity('crosswordAttempt')
export class CrosswordAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  crosswordId: number;

  @ManyToOne(() => Crossword, (crossword) => crossword.attempts)
  crossword: Crossword;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ default: 0 })
  earnPoint: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiredAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  createdBy: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  updatedBy: number;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ nullable: true })
  deletedBy: number;
}
