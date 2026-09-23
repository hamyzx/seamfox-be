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
import { Skill } from '../../common/entities/skill.entity';

@Entity('candidate_skill')
export class CandidateSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column()
  skillId: number;

  @Column({ nullable: true })
  proficiencyLevel: string;

  @Column({ nullable: true, default: 0 })
  yearsOfExperience: number;

  @ManyToOne(() => Candidate, (candidate) => candidate.candidateSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @ManyToOne(() => Skill, (skill) => skill.candidateSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skillId' })
  skill: Skill;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
