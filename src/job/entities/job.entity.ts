import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Language } from '../../common/entities/language.entity';
import { Application } from '../../application/entities/application.entity';
import { Education } from '../../common/entities/education.entity';
import {
  EmploymentType,
  LocationType,
  SalaryType,
  JobStatus,
  JobLevel,
} from '../../lib/enums/job.enum';
import { JobTitle } from './job-title.entity';
import { JobLanguage } from '../../job-language/entities/job-language.entity';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  companyId: number;

  @Column({ type: 'enum', enum: ['company', 'admin'], default: 'company' })
  createdByType: 'company' | 'admin';

  @Column({ type: 'uuid', nullable: true })
  createdByAdminId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  companyLogo: string;

  @Column({ type: 'boolean', default: false })
  hideCompanyName: boolean;

  @Column()
  jobTitleId: number;

  @ManyToOne(() => JobTitle, (jobTitle) => jobTitle.jobs)
  @JoinColumn({ name: 'jobTitleId' })
  jobTitle: JobTitle;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  responsibilities: string;

  @Column({ type: 'enum', enum: EmploymentType, nullable: true })
  employmentType: EmploymentType;

  @Column({ type: 'enum', enum: EmploymentType, nullable: true })
  contractType: EmploymentType;

  @Column({ type: 'enum', enum: LocationType, nullable: true })
  locationType: LocationType;

  @Column({ nullable: true })
  department: string;

  @Column({ type: 'varchar', nullable: true })
  reportingTo: string;

  @Column({ type: 'int', nullable: true })
  minExperience: number;

  @Column({ type: 'int', nullable: true })
  maxExperience: number;

  @Column({ default: false })
  isTravelExpenseIncluded: boolean;

  @Column({ nullable: true })
  workMode: string;

  @Column({ type: 'text', array: true, nullable: true })
  workingDays: string[];

  @Column({ type: 'text', array: true, nullable: true })
  benefits: string[];

  @Column({ type: 'varchar', nullable: true })
  additionalRequirements: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', nullable: true })
  longitude: number;

  @Column({ type: 'decimal', nullable: true })
  latitude: number;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ type: 'varchar', nullable: true })
  salary: string;

  @Column({ type: 'int', default: 1 })
  totalPositions: number;

  @Column({ type: 'enum', enum: SalaryType })
  salaryType: SalaryType;

  @Column()
  salaryCurrency: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.DRAFT })
  status: JobStatus;

  @Column({ nullable: true })
  kanbanBoardId: number;

  @Column({ type: 'date', nullable: true })
  jobPostedDate: Date;

  @Column({ type: 'date', nullable: true })
  jobExpiryDate: Date;

  @Column({ nullable: true })
  requiredEducationId: number;

  @OneToMany(() => JobLanguage, (jl) => jl.job, { cascade: true })
  jobLanguages: JobLanguage[];

  @ManyToOne(() => Education, (education) => education.jobs)
  @JoinColumn({ name: 'requiredEducationId' })
  education: Education;

  @ManyToMany(() => Education, (education) => education.multipleJobs)
  @JoinTable({
    name: 'job_educations',
    joinColumn: { name: 'jobId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'educationId', referencedColumnName: 'id' },
  })
  educations: Education[];

  @Column({ type: 'enum', enum: JobLevel, default: JobLevel.MID })
  jobLevel: JobLevel;

  @ManyToOne(() => Company, (company) => company.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];

  @Column({ default: false })
  isConfidentialName: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;
}