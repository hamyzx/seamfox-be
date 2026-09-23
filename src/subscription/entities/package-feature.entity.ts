import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Unique,
} from 'typeorm';
import { Package } from './package.entity';
import { Feature } from './feature.entity';

@Entity('package_features')
@Unique(['packageId', 'featureId'])
export class PackageFeature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  packageId: number;

  @ManyToOne(() => Package, (pkg) => pkg.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packageId' })
  package: Package;

  @Column()
  featureId: number;

  @ManyToOne(() => Feature, (f) => f.packageFeatures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'featureId' })
  feature: Feature;

  @Column({ type: 'varchar', nullable: true })
  limit: string;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
