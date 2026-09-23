// src/common/entities/language.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { CandidateNationality } from '../../candidate-nationality/entities/candidate-nationality.entity';

@Entity('nationality')
export class Nationality {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => CandidateNationality, (cn) => cn.nationality)
  candidateNationalities: CandidateNationality[];
}
