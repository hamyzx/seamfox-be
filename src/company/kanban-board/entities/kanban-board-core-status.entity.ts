import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { KanbanBoardStatus } from './kanban-board-status.entity';

@Entity('kanban_board_core_status')
export class KanbanBoardCoreStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // Applied, Shortlisted, Interview, Hired, Rejected

  @Column()
  order: number;

  @OneToMany(() => KanbanBoardStatus, (status) => status.coreStatus)
  boardStatuses: KanbanBoardStatus[];
}
