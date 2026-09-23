// src/common/entities/language.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CandidateLanguage } from '../../candidate-language/entities/candidate-language.entity';
import { JobLanguage } from '../../job-language/entities/job-language.entity';

@Entity('language')
export class Language {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => CandidateLanguage, (cl) => cl.language)
  candidateLanguages: CandidateLanguage[];

  @OneToMany(() => JobLanguage, (jl) => jl.language)
  jobLanguages: JobLanguage[];
}
