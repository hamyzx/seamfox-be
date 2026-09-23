import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Crossword } from './crossword.entity';

@Entity('crosswordClues')
export class CrossWordClue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  crosswordId: number;

  @ManyToOne(() => Crossword, (crossword) => crossword.clues)
  @JoinColumn({ name: 'crosswordId' })
  crossword: Crossword;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'text' })
  clue: string;

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
}
