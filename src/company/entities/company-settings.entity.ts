import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('company_settings')
export class CompanySettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'text', nullable: true })
  interviewTemplate: string;

  @Column({ type: 'text', nullable: true })
  acceptedTemplate: string;

  @Column({ type: 'text', nullable: true })
  rejectedTemplate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}