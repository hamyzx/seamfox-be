import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { Nationality } from '../../common/entities/nationality.entity';

@Entity('candidate_nationalities')
export class CandidateNationality {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column()
  nationalityId: number;

  @ManyToOne(() => Candidate, (candidate) => candidate.candidateNationalities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @ManyToOne(() => Nationality, (nationality) => nationality.candidateNationalities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'nationalityId' })
  nationality: Nationality;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
