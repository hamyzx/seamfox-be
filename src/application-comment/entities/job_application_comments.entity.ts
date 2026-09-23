import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Application } from '../../application/entities/application.entity';

@Entity('job_application_comments')
export class JobApplicationComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @Column({ type: 'text' })
  comment: string;

  @Column({ nullable: true })
  createdBy: number; // e.g. company userId or candidateId

  @CreateDateColumn()
  createdAt: Date;

  // ─── Relations ─────────────────────────────
  @ManyToOne(() => Application, (application) => application.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicationId' })
  application: Application;
}
