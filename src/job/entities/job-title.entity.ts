import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Job } from './job.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';

@Entity('job_titles')
export class JobTitle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;

  @OneToMany(() => Job, (job) => job.jobTitle)
  jobs: Job[];

  @OneToMany(() => Candidate, (candidate) => candidate.jobTitle)
  candidates: Candidate[];
}
