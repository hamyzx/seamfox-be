import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  subscriptionId?: number | null;

  @ManyToOne(() => Subscription, (s) => s.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column({ type: 'varchar', nullable: true })
  customerId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentIntentId?: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amount?: number | null;

  @Column({ type: 'varchar', nullable: true })
  currency?: string | null;

  @Column({ type: 'varchar', nullable: true })
  status?: string | null;

  @Column({ type: 'varchar', nullable: true })
  cardBrand?: string | null;

  @Column({ type: 'varchar', nullable: true })
  cardLastFourDigit?: string | null;

  @Column({ type: 'int', nullable: true })
  expiryMonth?: number | null;

  @Column({ type: 'int', nullable: true })
  expiryYear?: number | null;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod?: string | null;

  @Column({ type: 'varchar', nullable: true })
  cardholderName?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  stripeSubscriptionId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  referenceNo?: string | null;

  @Column({ type: 'varchar', nullable: true })
  invoiceId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  invoiceNumber?: string | null;

  @Column({ type: 'varchar', nullable: true })
  hostedInvoiceUrl?: string | null;

  @Column({ type: 'varchar', nullable: true })
  invoicePdf?: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
