import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { UserRoles } from '../../lib/enums/user.enum';

@Entity('login_activity')
export class LoginActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Index()
  @Column({ type: 'enum', enum: UserRoles })
  userType: UserRoles;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  loginAt: Date;
}
