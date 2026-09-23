import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { PackageFeature } from './package-feature.entity';
import { Subscription } from './subscription.entity';
import { UserRoles } from '../../lib/enums/user.enum';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('int')
  monthlyPrice: number;

  @Column('int')
  quarterlyPrice: number;

  @Column('int')
  annualPrice: number;

  @Column({ type: 'enum', enum: UserRoles, nullable: true })
  role: UserRoles;

  @Column({ type: 'boolean', default: true })
  isQuarterly: boolean;

  @Column({ type: 'boolean', default: true })
  isAnnually: boolean;

  @Column({ type: 'boolean', default: true })
  isMonthly: boolean;

  @OneToMany(() => PackageFeature, (pf) => pf.package, { cascade: true })
  features: PackageFeature[];

  @OneToMany(() => Subscription, (s) => s.package)
  subscriptions: Subscription[];

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
