import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Blog } from './blog.entity';
import { User } from '../../user/entities/user.entity';

@Entity('blog_reads')
@Unique('UQ_blog_user_read', ['blogId', 'userId'])
@Index(['blogId'])
export class BlogRead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  blogId: number;

  @ManyToOne(() => Blog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blogId' })
  blog: Blog;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}