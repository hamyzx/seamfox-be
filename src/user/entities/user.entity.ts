import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserStatus, UserRoles } from '../../lib/enums/user.enum';
import { Follower } from './follower.entity';
import { Friend } from './friend.entity';
import { UserRequest } from './request.entity';
import { Company } from '../../company/entities/company.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { Blog } from '../../blog/entities/blog.entity';
import { Subscription } from '../../subscription/entities/subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Index()
  @Column({ unique: true })
  username: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  emailBackup?: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  profileImg?: string;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ nullable: true })
  currentLocation: string;

  @Column({ default: 0 })
  totalEvents: number;

  @Column({ default: 0 })
  totalPosts: number;

  @Column({ default: 0 })
  totalFriends: number;

  @Column({ default: 0 })
  totalFollowers: number;

  @Index()
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.INACTIVE })
  status: UserStatus;

  @Column({ type: 'varchar', nullable: true })
  comment: string;

  @Column({ type: 'enum', enum: UserRoles })
  role: UserRoles;

  @Column({ nullable: true })
  socialId?: string;

  @Column({ nullable: true })
  socialType?: string;

  @Column({ default: false })
  isInfluencer: boolean;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({ default: false })
  isSubscribed: boolean;

  @Index()
  @Column({ default: false })
  marketingOptIn: boolean;
 
  @Column({ type: 'timestamp', nullable: true })
  marketingOptInAt: Date | null;
 
  @Column({ type: 'timestamp', nullable: true })
  marketingOptOutAt: Date | null;

  @OneToMany(() => Follower, (f) => f.follower, { cascade: true })
  following: Follower[];

  @OneToMany(() => Follower, (f) => f.following, { cascade: true })
  followers: Follower[];

  @OneToMany(() => Friend, (f) => f.user, { cascade: true })
  friends: Friend[];

  @OneToMany(() => Friend, (f) => f.friend, { cascade: true })
  friendedBy: Friend[];

  @OneToMany(() => UserRequest, (r) => r.requester, { cascade: true })
  sentRequests: UserRequest[];

  @OneToMany(() => UserRequest, (r) => r.targetUser, { cascade: true })
  receivedRequests: UserRequest[];

  @OneToMany(() => Blog, (blog) => blog.user, { cascade: true })
  blog: Blog[];

  @OneToOne(() => Company, (company) => company.user)
  company: Company;

  @OneToOne(() => Candidate, (candidate) => candidate.user)
  candidate: Candidate;

  @Column({ type: 'timestamp', nullable: true })
  lastActive: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // 🔥 SINGLE @DeleteDateColumn — TypeORM auto-fills on softDelete()
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  // 🔥 Tracks when permanent deletion is scheduled (14 days from soft delete)
  @Column({ type: 'timestamp', nullable: true })
  scheduledDeletionAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deletedById' })
  deletedBy?: User;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ type: 'varchar', nullable: true })
  stripeAccountId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripeCustomerId?: string | null;

  @OneToOne(() => Subscription, (subscription) => subscription.user)
  subscription: Subscription;
}