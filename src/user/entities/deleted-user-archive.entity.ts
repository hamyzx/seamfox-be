import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('deleted_users_archive')
export class DeletedUserArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Only userId reference — for FK chain (posts/comments still link here)
  @Column({ type: 'uuid', nullable: false })
  originalUserId: string;

  // Non-PII metadata — needed for admin filtering by role
  @Column({ nullable: true })
  originalRole: string; // CANDIDATE / COMPANY / ADMIN

  // Deletion metadata
  @Column({ default: 'SELF' })
  deletedBy: string; // 'SELF' | 'ADMIN' | 'SYSTEM'

  @Column({ nullable: true })
  deletionReason: string;

  @CreateDateColumn({ type: 'timestamp' })
  deletedAt: Date;
}