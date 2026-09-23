import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';
// import { User } from '../../user/entities/user.entity';

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'int' })
  timeLimit: number; // seconds

  @OneToMany(() => QuizQuestion, (q) => q.quiz)
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, (a) => a.quiz)
  attempts: QuizAttempt[];

  @Column({ type: 'uuid' })
  createdBy: string;

  // @ManyToOne(() => User, { onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'createdBy' })
  // creator: User;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  // @ManyToOne(() => User, { onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'updatedBy' })
  // updater: User;

  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;

  // @ManyToOne(() => User, { onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'deletedBy' })
  // deleter: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
