export class MysteryAttemptEntity {}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Mystery } from './mystery.entity';
import { MysteryOption } from './mystery-option.entity';
import { User } from '../../user/entities/user.entity';

@Entity('mystery_attempts')
export class MysteryAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  mysteryId: number;

  @ManyToOne(() => Mystery, (mystery) => mystery.attempts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mysteryId' })
  mystery: Mystery;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', nullable: true })
  selectedOptionId: number;

  @ManyToOne(() => MysteryOption, { eager: true })
  @JoinColumn({ name: 'selectedOptionId' })
  selectedOption: MysteryOption;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ type: 'int', default: 0 })
  earnPoint: number;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiredAt?: Date;
}
