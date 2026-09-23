import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('news_articles_weekly')
@Index(['weekOf', 'fetchedDate'])
@Index(['url'], { unique: true })
export class NewsArticleWeekly {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', unique: true })
  url: string;

  @Column({ type: 'text', nullable: true, name: 'url_to_image' })
  urlToImage: string | null;

  @Column({ type: 'timestamp', name: 'published_at' })
  publishedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'source_id' })
  sourceId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'source_name' })
  sourceName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'query_topic' })
  queryTopic: string | null;

  // ── Tracking fields ──
  @Column({ type: 'date', name: 'fetched_date' })
  fetchedDate: string; // e.g., '2026-05-25'

  @Column({ type: 'varchar', length: 10, name: 'week_of' })
  weekOf: string; // e.g., '2026-W21'

  @Column({ type: 'boolean', default: false, name: 'is_top_pick' })
  isTopPick: boolean;

  @Column({ type: 'boolean', default: false, name: 'used_in_blog' })
  usedInBlog: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}