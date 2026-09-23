// src/common/entities/language.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CandidateSkill } from '../../skill/entities/candidate-skill.entity';

@Entity('skill')
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => CandidateSkill, (candidateSkill) => candidateSkill.skill)
  candidateSkills: CandidateSkill[];
}
