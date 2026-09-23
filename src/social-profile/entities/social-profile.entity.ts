import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { SocialMedias } from '../../lib/enums/user.enum';

@Entity()
export class SocialProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column({ type: 'enum', enum: SocialMedias })
  platform: SocialMedias;

  @Column()
  url: string;

  @ManyToOne(() => Candidate, (candidate) => candidate.socialProfiles, { onDelete: 'CASCADE' })
  candidate: Candidate;
}
