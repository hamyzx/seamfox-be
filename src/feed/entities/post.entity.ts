import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PostVisibility, PostStatus } from '../../lib/enums/post-visibility.enum';
import { PostMedia } from './post-media.entity';
import { PostLike } from './post-like.entity';
import { PostComment } from './post-comment.entity';
import { User } from '../../user/entities/user.entity';
import { Poll } from './poll.entity';
import { Blog } from '../../blog/entities/blog.entity'; // 🔥 NEW

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy: User;

  @Column({ nullable: true })
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'decimal', nullable: true })
  latitude: number;

  @Column({ type: 'decimal', nullable: true })
  longitude: number;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'enum', enum: PostVisibility, default: PostVisibility.PUBLIC })
  visibility: PostVisibility;

  @Column({ default: 0 })
  totalShares: number;

  @Column({ default: 0 })
  totalViews: number;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.PUBLISHED })
  status: PostStatus;

  @Column({ type: 'text', nullable: true })
  moderationReason?: string;

  @Column({ type: 'decimal', nullable: true })
  moderationScore?: number;

  @Column('text', { array: true, default: [] })
  @Index('idx_post_tags', { synchronize: false })
  tags: string[];

  @OneToOne(() => Poll, (poll) => poll.post, { cascade: true, nullable: true })
  poll?: Poll;

  // REPOST RELATION (existing)
  @ManyToOne(() => Post, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sharedPostId' })
  sharedPost?: Post;

  @OneToMany(() => Post, (post) => post.sharedPost)
  shares?: Post[];

  // 🔥 NEW: SHARED BLOG/ARTICLE RELATION
  @Column({ type: 'int', nullable: true })
  sharedBlogId?: number;

  @ManyToOne(() => Blog, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sharedBlogId' })
  sharedBlog?: Blog;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PostMedia, (media) => media.post, { cascade: true })
  media: PostMedia[];

  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];

  @OneToMany(() => PostComment, (comment) => comment.post)
  comments: PostComment[];

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}