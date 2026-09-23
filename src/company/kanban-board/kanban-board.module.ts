import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanbanBoard } from './entities/kanban-board.entity';
import { KanbanBoardCoreStatus } from './entities/kanban-board-core-status.entity';
import { KanbanBoardStatus } from './entities/kanban-board-status.entity';
import { KanbanBoardService } from './kanban-board.service';
import { KanbanBoardController } from './kanban-board.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KanbanBoard, KanbanBoardCoreStatus, KanbanBoardStatus])],
  providers: [KanbanBoardService],
  controllers: [KanbanBoardController],
  exports: [TypeOrmModule, KanbanBoardService],
})
export class KanbanBoardModule {}
