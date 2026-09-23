import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Resume } from '../../resume/entities/resume.entity';

@Entity('resume_download_history')
export class ResumeDownloadHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number; // who downloaded

  @Column()
  resumeId: number; // which file downloaded

  @CreateDateColumn()
  downloadedAt: Date;

  @ManyToOne(() => Resume, (resume) => resume.downloadHistory, { onDelete: 'CASCADE' })
  resume: Resume;
}
