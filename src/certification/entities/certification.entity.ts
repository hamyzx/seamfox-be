import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Candidate } from '../../candidate/entities/candidate.entity';

@Entity()
export class Certification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  candidateId: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ type: 'timestamp' })
  issueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date;

  @Column({ nullable: true })
  filePath: string;

  @ManyToOne(() => Candidate, (candidate) => candidate.certifications, { onDelete: 'CASCADE' })
  candidate: Candidate;
}
