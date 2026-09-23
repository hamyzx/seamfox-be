import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { OTPType } from '../../lib/enums/otp.enum';

@Entity('otp_phones')
export class OTPPhone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'int' })
  code: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'enum', enum: OTPType })
  type: OTPType;

  @Column({ type: 'timestamp', nullable: true })
  consumedAt?: Date;
}
