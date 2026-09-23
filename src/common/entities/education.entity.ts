// src/common/entities/education.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { Job } from '../../job/entities/job.entity';

@Entity('common-education')
export class Education {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => Job, (job) => job.education)
  jobs: Job[];

  @ManyToMany(() => Job, (job) => job.educations)
  multipleJobs: Job[];
}