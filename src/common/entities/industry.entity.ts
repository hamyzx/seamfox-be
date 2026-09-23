import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('industry')
@Unique(['name', 'function']) 
export class Industry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column() 
  name: string;

  @Column({ nullable: true })
  function: string;

  @OneToMany(() => Company, (company) => company.industryId)
  companies: Company[];
}