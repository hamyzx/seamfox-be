import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../user/entities/user.entity';
import { Education } from '../../education/entities/education.entity';
import { Certification } from '../../certification/entities/certification.entity';
import { Resume } from '../../resume/entities/resume.entity';
import { CandidateSkill } from '../../candidate-skills/entities/candidate-skills.entity';
import { SocialProfile } from '../../social-profile/entities/social-profile.entity';
import { Application } from '../../application/entities/application.entity';
import { JobTitle } from '../../job/entities/job-title.entity';
import { Review } from '../../review/entities/review.entity';
import { Interest } from '../../interest/entities/interest.entity';
import { AlternativeNumberType, CandidateStatus, Gender } from '../../lib/enums/candidate.enum';
import { CandidateLanguage } from '../../candidate-language/entities/candidate-language.entity';
import { CandidateNationality } from '../../candidate-nationality/entities/candidate-nationality.entity';
import { CandidateStatusHistory } from '../../candidate-status-history/entities/candidate-status-history.entity';
import { Industry } from '../../common/entities/industry.entity';
import { Experience } from '../../experience/entities/experience.entity';

@Entity('candidate')
export class Candidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', nullable: true })
  longitude: number;

  @Column({ type: 'decimal', nullable: true })
  latitude: number;

  @Column({ nullable: true })
  countryCode: string;

  @Column({ nullable: true })
  phoneNumber: string;

  // 🔥 NEW: Alternative contact number (e.g. WhatsApp/Telegram/WeChat/Phone)
  @Column({ nullable: true })
  alternativeNumber: string;

  // 🔥 NEW: Type of alternative number
  @Column({
    type: 'enum',
    enum: AlternativeNumberType,
    nullable: true,
  })
  alternativeNumberType: AlternativeNumberType;

  @Column({ nullable: true })
  noticePeriod: string;

  @Column({ name: 'current_company', nullable: true })
  currentCompany: string;

  @Column()
  jobTitleId: number;

  @Column({ nullable: true })
  industryId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  yearOfExperience: number;

  @Column({
    type: 'enum',
    enum: CandidateStatus,
    default: CandidateStatus.PENDING,
  })
  status: CandidateStatus;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  minSalary: number;

  @Column({ nullable: true })
  maxSalary: number;

  @Column({ default: false })
isCurrentSalaryConfidential: boolean;

@Column({ default: false })
isExpectedSalaryConfidential: boolean;

  @Column({ default: false })
  isEmailConfidential: boolean;

  @Column({ default: false })
  isPhoneConfidential: boolean;

  @Column({ default: false })
  isAddressConfidential: boolean;

  @Column({ default: false })
  isCvConfidential: boolean;

  @Column({ default: false })
  isLinkedinConfidential: boolean;
  

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Education, (edu) => edu.candidate)
  education: Education[];

  @OneToMany(() => Certification, (cert) => cert.candidate)
  certifications: Certification[];

  @OneToMany(() => Resume, (resume) => resume.candidate)
  resumes: Resume[];

  @OneToMany(() => CandidateSkill, (candidateSkill) => candidateSkill.candidate, { cascade: true })
  candidateSkills: CandidateSkill[];

  @OneToMany(() => SocialProfile, (sp) => sp.candidate)
  socialProfiles: SocialProfile[];

  @OneToMany(() => Application, (application) => application.candidate)
  applications: Application[];

  @OneToMany(() => CandidateNationality, (cn) => cn.candidate, { cascade: true })
  candidateNationalities: CandidateNationality[];

  @OneToMany(() => CandidateLanguage, (cl) => cl.candidate)
  languages: CandidateLanguage[];

  @ManyToOne(() => JobTitle, (jobTitle) => jobTitle.candidates)
  @JoinColumn({ name: 'jobTitleId' })
  jobTitle: JobTitle;

  @ManyToOne(() => Industry, { nullable: true })
  @JoinColumn({ name: 'industryId' })
  industry: Industry;

  @OneToMany(() => Review, (review) => review.candidate)
  reviews: Review[];

  @OneToMany(() => Interest, (interest) => interest.candidate)
  interests: Interest[];

   @OneToMany(() => Experience, (exp) => exp.candidate, { cascade: true })
   experiences: Experience[];

  @OneToMany(() => CandidateStatusHistory, (h) => h.candidate)
  statusHistory: CandidateStatusHistory[];
}