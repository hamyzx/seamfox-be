import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { BlogCategory } from './blog-category.entity';
import { BlogStatus } from '../../lib/enums/blog-status.enum';
import { User } from '../../user/entities/user.entity';

@Entity('blogs')
export class Blog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column('text')
  content: string;

  @Column()
  shortDescription: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column()
  categoryId: number;

  @ManyToOne(() => BlogCategory, (category) => category.blogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: BlogCategory;

  @Column({ type: 'uuid', nullable: true })
  authorId: string;

  @Column({ type: 'timestamp', nullable: true })
  publishAt: Date;

  @Column({ type: 'enum', enum: BlogStatus, default: BlogStatus.PUBLISHED })
  status: BlogStatus;

  @Column({ default: false })
  isEditorPick: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ nullable: true })
  readTime: string;

  @Column({ nullable: true })
  badgeLabel: string;

  @Column({ default: false })
  isMembersContribution: boolean;

  @Column({ type: 'timestamp', nullable: true })
  notificationSentAt: Date | null;

  @Column({ default: false })
  isAiGenerated: boolean;

  @Column({ type: 'timestamp', nullable: true })
  aiGeneratedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  aiSourceUrl: string | null;

  @Column({ type: 'text', nullable: true })
  aiSourceTitle: string | null;

  @ManyToOne(() => User, (user) => user.blog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}