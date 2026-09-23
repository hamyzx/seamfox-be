import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Candidate } from '../../candidate/entities/candidate.entity';

@Entity()
export class Education {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column()
  instituationName: string;

  @Column()
  degree: string;

  @Column()
  major: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @ManyToOne(() => Candidate, (candidate) => candidate.education, { onDelete: 'CASCADE' })
  candidate: Candidate;
}
