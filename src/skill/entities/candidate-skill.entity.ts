import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, JoinColumn } from 'typeorm';

import { Candidate } from '../../candidate/entities/candidate.entity';
import { Skill } from '../../common/entities/skill.entity';
import { Min, Max } from 'class-validator';

@Entity('candidate_skill')
@Unique(['candidateId', 'skillId'])
export class CandidateSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column()
  skillId: number;

  @Column({ type: 'int', nullable: true })
  @Min(1)
  @Max(5)
  proficiencyLevel: number;

  @Column({ type: 'int', default: 0 })
  yearsOfExperience: number;

  @ManyToOne(() => Candidate, (candidate) => candidate.candidateSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @ManyToOne(() => Skill, (skill) => skill.candidateSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'skillId' })
  skill: Skill;
}
