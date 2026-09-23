import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Job } from '../../job/entities/job.entity';
import { Language } from '../../common/entities/language.entity';

@Entity('job_languages')
export class JobLanguage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Job, (job) => job.jobLanguages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => Language, (language) => language.jobLanguages, { eager: true })
  @JoinColumn({ name: 'languageId' })
  language: Language;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
