import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Subscription } from '../../subscription/entities/subscription.entity';

@Entity('conversation_permanents')
export class ConversationPermanent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('ux_conversation_permanents_pair_key', { unique: true })
  @Column({ type: 'text' })
  pairKey: string;

  @Column()
  subscriptionId: number;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @DeleteDateColumn({ nullable: true }) deletedAt?: Date | null;
}
