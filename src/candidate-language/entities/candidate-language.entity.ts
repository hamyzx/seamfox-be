export class CandidateLanguageEntity {}
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
import { Language } from '../../common/entities/language.entity';

@Entity('candidate_language')
export class CandidateLanguage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column()
  languageId: number;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isWrite: boolean;

  @Column({ default: false })
  isSpoken: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Candidate, (candidate) => candidate.languages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @ManyToOne(() => Language, (language) => language.candidateLanguages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'languageId' })
  language: Language;
}
