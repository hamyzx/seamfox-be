import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { Job } from '../../job/entities/job.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { Resume } from '../../resume/entities/resume.entity';
import { KanbanBoardStatus } from '../../company/kanban-board/entities/kanban-board-status.entity';
import { JobApplicationComment } from '../../application-comment/entities/job_application_comments.entity';

@Entity('job_applications')
// @Unique(['jobId', 'candidateId'])
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobId: number;

  @Column()
  candidateId: number;

  @Column({ nullable: true })
  resumeId: number;

  @Column({ nullable: true, default: null })
  kanbanBoardStatusId: number | null;

  @Column({ nullable: true })
  comment: string;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;

  // ─── Relations ─────────────────────────────

  @ManyToOne(() => Job, (job) => job.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => Candidate, (candidate) => candidate.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @ManyToOne(() => Resume, (resume) => resume.applications, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resumeId' })
  resume: Resume;

  @ManyToOne(() => KanbanBoardStatus, (status) => status.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kanbanBoardStatusId' })
  kanbanBoardStatus: KanbanBoardStatus;

  @OneToMany(() => JobApplicationComment, (comment) => comment.application, {
    cascade: true,
  })
  comments: JobApplicationComment[];
}
