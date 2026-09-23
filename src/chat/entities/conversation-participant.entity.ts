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
import { Conversation } from './conversation.entity';
import { User } from '../../user/entities/user.entity';
@Entity('conversation_participants')
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index() @Column('uuid') conversationId: string;
  @Index() @Column('uuid') userId: string;

  @ManyToOne(() => Conversation, (c) => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', default: 0 })
  unreadCount: number;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean; 

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn({ nullable: true }) updatedAt: Date | null;
  @DeleteDateColumn({ nullable: true }) deletedAt?: Date | null;
}
