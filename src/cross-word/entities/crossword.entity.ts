import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { CrossWordClue } from './crossword-clue.entity';
import { CrosswordAttempt } from './crossword-attempt.entity';

@Entity('crossword')
export class Crossword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  maxPoint: number;

  @Column()
  timeLimit: number; // in seconds

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;

  @OneToMany(() => CrossWordClue, (clue) => clue.crossword)
  clues: CrossWordClue[];

  @OneToMany(() => CrosswordAttempt, (attempt) => attempt.crossword)
  attempts: CrosswordAttempt[];
}
