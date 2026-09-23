import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Company } from '../../company/entities/company.entity';
import { CompanyStatus } from '../../lib/enums/company.enum';

@Entity('company_status_history')
export class CompanyStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @Column({ type: 'enum', enum: CompanyStatus })
  status: CompanyStatus;

  @Column({ nullable: true })
  adminId?: string | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @ManyToOne(() => Company, (company) => company.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  // @Column({ nullable: true })
  // adminId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
