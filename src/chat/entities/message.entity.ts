import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { MessageAttachment } from './message-attachment.entity';
import { User } from '../../user/entities/user.entity';

export type MessageKind = 'text' | 'attachment';
export type MessageStatus = 'sent' | 'delivered' | 'seen';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index() @Column('uuid') conversationId: string;
  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Index() @Column('uuid') senderId: string;
  @ManyToOne(() => User, { eager: false }) @JoinColumn({ name: 'senderId' }) sender: User;

  @Column('uuid') recipientId: string;
  @ManyToOne(() => User, { eager: false }) @JoinColumn({ name: 'recipientId' }) recipient: User;

  @Column({ type: 'text', nullable: true }) body: string | null;
  @Column({ type: 'varchar', length: 16, default: 'text' }) kind: MessageKind;

  @Column({ type: 'varchar', length: 16, default: 'sent' }) status: MessageStatus;
  @Column({ type: 'timestamp', nullable: true }) deliveredAt: Date | null;
  @Column({ type: 'timestamp', nullable: true }) seenAt: Date | null;

  @CreateDateColumn() createdAt: Date;
  @DeleteDateColumn({ nullable: true }) deletedAt?: Date | null;

  @OneToMany(() => MessageAttachment, (a) => a.message, { cascade: true })
  attachments: MessageAttachment[];
}
