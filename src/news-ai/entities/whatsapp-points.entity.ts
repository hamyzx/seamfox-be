import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('whatsapp_points')
@Index(['weekOf', 'fetchedDate'])
export class WhatsappPoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  point: string;

  @Column({ type: 'text', nullable: true, name: 'article_url' })
  articleUrl: string | null;

  @Column({ type: 'text', nullable: true, name: 'article_title' })
  articleTitle: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'source_name' })
  sourceName: string | null;

  // ── Tracking fields ──
  @Column({ type: 'date', name: 'fetched_date' })
  fetchedDate: string; // e.g., '2026-05-25'

  @Column({ type: 'varchar', length: 10, name: 'week_of' })
  weekOf: string; // e.g., '2026-W21'

  @Column({ type: 'integer', name: 'point_order' })
  pointOrder: number; // 1-5

  @Column({ type: 'boolean', default: false, name: 'sent_to_whatsapp' })
  sentToWhatsApp: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}