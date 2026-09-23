import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PackageFeature } from './package-feature.entity';

@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  title: string;

  @Column('text')
  description: string;

  @OneToMany(() => PackageFeature, (pf) => pf.feature)
  packageFeatures: PackageFeature[];
}
