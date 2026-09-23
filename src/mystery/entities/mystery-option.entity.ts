export class MysteryOptionEntity {}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Mystery } from './mystery.entity';
import { User } from '../../user/entities/user.entity';

@Entity('mystery_options')
@Index('unique_correct_option_per_mystery', ['mysteryId'], {
  unique: true,
  where: `"isCorrect" = true`,
})
export class MysteryOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  mysteryId: number;

  @ManyToOne(() => Mystery, (mystery) => mystery.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mysteryId' })
  mystery: Mystery;

  @Column('text')
  meaning: string;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

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
