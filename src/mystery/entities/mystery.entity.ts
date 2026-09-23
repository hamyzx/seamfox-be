import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MysteryOption } from './mystery-option.entity';
import { MysteryAttempt } from './mystery-attempt.entity';
import { User } from '../../user/entities/user.entity';

@Entity('mysteries')
export class Mystery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  weekNo: number;

  @Column({ type: 'varchar' })
  word: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'int' })
  timeLimit: number; // seconds

  @Column({ type: 'int' })
  maxPoint: number;

  @OneToMany(() => MysteryOption, (opt) => opt.mystery, { cascade: true })
  options: MysteryOption[];

  @OneToMany(() => MysteryAttempt, (attempt) => attempt.mystery)
  attempts: MysteryAttempt[];

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedBy' })
  updater: User;

  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deletedBy' })
  deleter: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
