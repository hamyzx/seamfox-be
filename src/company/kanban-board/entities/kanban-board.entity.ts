import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Company } from '../../entities/company.entity';
import { KanbanBoardStatus } from './kanban-board-status.entity';

@Entity('kanban_board')
export class KanbanBoard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  companyId: number;

  @ManyToOne(() => Company, (company) => company.kanbanBoards, { onDelete: 'CASCADE' })
  company: Company;

  @OneToMany(() => KanbanBoardStatus, (status) => status.kanbanBoard)
  statuses: KanbanBoardStatus[];
}
