import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  Unique,
  JoinColumn,
} from 'typeorm';
import { KanbanBoard } from './kanban-board.entity';
import { KanbanBoardCoreStatus } from './kanban-board-core-status.entity';
import { Application } from '../../../application/entities/application.entity';
@Entity('kanban_board_status')
@Unique(['kanbanBoardId', 'order']) // composite unique constraint
export class KanbanBoardStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  order: number;

  @Column({ default: false })
  isDefault: boolean;

  @Column()
  kanbanBoardId: number;

  @ManyToOne(() => KanbanBoard, (board) => board.statuses, { onDelete: 'CASCADE' })
  kanbanBoard: KanbanBoard;

  @Column({ nullable: true })
  jobCoreStatusId: number;

  @ManyToOne(() => KanbanBoardCoreStatus, (coreStatus) => coreStatus.boardStatuses, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'jobCoreStatusId' })
  coreStatus: KanbanBoardCoreStatus;

  @OneToMany(() => Application, (application) => application.kanbanBoardStatus)
  applications: Application[];
}
