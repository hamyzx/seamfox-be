import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';
import { OTPType } from '../../lib/enums/otp.enum';

@Entity('otps')
export class OTP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  code: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'enum', enum: OTPType })
  type: OTPType;

  @Column({ type: 'timestamp', nullable: true })
  consumedAt?: Date;


  @Column()
  @Index()
  createdBy: string;
}
