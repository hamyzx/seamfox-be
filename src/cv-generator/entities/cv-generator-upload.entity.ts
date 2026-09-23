import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum CvGeneratorStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('cv_generator_uploads')
export class CvGeneratorUpload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  originalFileName: string;

  @Column({ type: 'varchar', length: 1000 })
  originalKey: string; 

  @Column({ type: 'int', nullable: true })
  originalSize: number; // bytes

  @Column({ type: 'varchar', length: 1000, nullable: true })
  processedKey: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  candidateName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  candidateEmail: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  candidatePhone: string | null;

  @Column({
    type: 'enum',
    enum: CvGeneratorStatus,
    default: CvGeneratorStatus.PROCESSING,
  })
  @Index()
  status: CvGeneratorStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploadedBy' })
  uploadedBy: User;

  @Column({ type: 'uuid', nullable: true })
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}