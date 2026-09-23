import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Industry } from '../../common/entities/industry.entity';
import { KanbanBoard } from '../kanban-board/entities/kanban-board.entity';
import { Job } from '../../job/entities/job.entity';
import { Review } from '../../review/entities/review.entity';
import { Interest } from '../../interest/entities/interest.entity';
import { CompanyStatus } from '../../lib/enums/company.enum';
import { CompanyStatusHistory } from '../../company-status-history/entities/company-status-history.entity';

@Entity('company')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string; // UUID instead of integer

  @Column({ unique: true })
  email: string;

@Column({ nullable: true })
countryCode: string;

@Column({ nullable: true })
  phoneNumber: string;

  @Column({ type: 'int', nullable: true })
  noOfEmployees: number;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  otherLocation: string;

  @Column({ type: 'text', nullable: true })
  about: string;

  @Column({ nullable: true })
  industryId: string;

  @Column({ nullable: true })
  representativeName: string;

  @Column({ nullable: true })
  representativeEmail: string;

  @Column({ nullable: true })
  representativePhoneNumber: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  linkedin: string;

  @Column({ nullable: true })
  landline: string;

  @Column({ default: false })
  isLandlineConfidential: boolean;

  @Column({ default: false })
  isEmailConfidential: boolean;

  @Column({ default: false })
  isRepEmailConfidential: boolean;

  @Column({ nullable: true })
  logo: string;

  @Column({ type: 'date', nullable: true })
  foundedYear: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  authorizedPerson: string;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.UNDER_REVIEW,
  })
  status: CompanyStatus;

  @Column({ type: 'text', nullable: true })
  changeRequestComment?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // tells TypeORM to use userId as FK
  user: User;

  @ManyToOne(() => Industry, (industry) => industry.companies, { nullable: true })
  industry: Industry;

  @OneToMany(() => KanbanBoard, (board) => board.company, { cascade: true })
  kanbanBoards: KanbanBoard[];

  @OneToMany(() => Job, (job) => job.company, { cascade: true })
  jobs: Job[];

  @OneToMany(() => Review, (review) => review.company)
  reviews: Review[];

  @OneToMany(() => Interest, (interest) => interest.company)
  interests: Interest[];

  @OneToMany(() => CompanyStatusHistory, (h) => h.company)
  statusHistory: CompanyStatusHistory[];

  @Column({ default: false })
  isPhoneConfidential: boolean;
 
  @Column({ default: false })
  isRepNameConfidential: boolean;
 
  @Column({ default: false })
  isRepPhoneConfidential: boolean;
}
