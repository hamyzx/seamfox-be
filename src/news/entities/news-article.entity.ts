import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';

@Entity('news_articles')
export class NewsArticle {
  @PrimaryGeneratedColumn()
  id: number;

  // 🔥 Hash of URL — prevents duplicates across queries
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  externalId: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', nullable: true })
  urlToImage: string | null;

  @Index()
  @Column({ type: 'timestamp' })
  publishedAt: Date;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  sourceId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  sourceName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  author: string | null;

  // 🔥 Vertical category — oil, metals, shipping, etc.
  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  // 🔥 Which compound query matched this article
  @Column({ type: 'varchar', length: 100, nullable: true })
  queryTopic: string | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  fetchedAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}