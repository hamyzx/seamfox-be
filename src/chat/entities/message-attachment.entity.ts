import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from './message.entity';

export type AttachmentType = 'image' | 'video' | 'audio' | 'document' | 'pdf' | 'other';

@Entity('message_attachments')
export class MessageAttachment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index() @Column('uuid') messageId: string;
  @ManyToOne(() => Message, (m) => m.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @Column({ type: 'varchar', length: 16 }) type: AttachmentType;
  @Column({ type: 'text' }) url: string;
  @Column({ type: 'text', nullable: true }) thumbnailUrl: string | null;

  @Column({ type: 'text', nullable: true }) mime: string | null;
  @Column({ type: 'text', nullable: true }) filename: string | null;
  @Column({ type: 'bigint', nullable: true }) size: string | null;

  @Column({ type: 'int', nullable: true }) width: number | null;
  @Column({ type: 'int', nullable: true }) height: number | null;
  @Column({ type: 'int', nullable: true }) pages: number | null;
  @Column({ type: 'int', nullable: true }) duration: number | null;

  @CreateDateColumn() createdAt: Date;
}
