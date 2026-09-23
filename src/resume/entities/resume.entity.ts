import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { Application } from '../../application/entities/application.entity';
import { ResumeDownloadHistory } from '../../resume-download/entities/resume-download.entity';

@Entity()
export class Resume {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column()
  filePath: string;

  @Column({ nullable: true })
  originalFilePath: string;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToOne(() => Candidate, (candidate) => candidate.resumes, { onDelete: 'CASCADE' })
  candidate: Candidate;

  @OneToMany(() => Application, (application) => application.resume)
  applications: Application[];

  @OneToMany(() => ResumeDownloadHistory, (history) => history.resume)
  downloadHistory: ResumeDownloadHistory[];
}
