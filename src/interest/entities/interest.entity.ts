import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';

@Entity('interests')
@Unique(['company', 'candidate'])
export class Interest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @ManyToOne(() => Company, (company) => company.interests, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  candidateId: number;

  @Column({ nullable: true })
  feedback: string;

  @ManyToOne(() => Candidate, (candidate) => candidate.interests, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

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
