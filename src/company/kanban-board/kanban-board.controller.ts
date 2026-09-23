import { Controller, Post, Get, Param, Body, Patch, Delete, ParseIntPipe } from '@nestjs/common';
import { IResponse } from '../../lib/interfaces/response.interface';
import { CreateKanbanBoardDto } from './dto/create-kanban-board.dto';
import { CreateKanbanColumnDto } from './dto/create-kanban-column.dto';
import { UpdateKanbanColumnDto } from './dto/update-kanban-column.dto';
import { KanbanBoardService } from './kanban-board.service';

@Controller('company/kanban')
export class KanbanBoardController {
  constructor(private readonly kanbanBoardService: KanbanBoardService) {}

  @Post()
  async createBoard(@Body() dto: CreateKanbanBoardDto) {
    const data = await this.kanbanBoardService.createBoard(dto);
    return { data };
  }

  @Get('core')
  async getCoreBoard(): Promise<IResponse> {
    const data = await this.kanbanBoardService.getCoreStatus();
    return { data, message: 'Data Fetched successfully' };
  }

  @Get(':companyId')
  async getBoard(@Param('companyId', ParseIntPipe) companyId: number): Promise<IResponse> {
    const data = await this.kanbanBoardService.getBoard(companyId);
    return { data, message: 'Data Fetched successfully' };
  }

  @Post('column')
  async addColumn(@Body() dto: CreateKanbanColumnDto) {
    const data = await this.kanbanBoardService.addColumn(dto);
    return { data };
  }

  @Patch('column/:id')
  updateColumn(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKanbanColumnDto) {
    return this.kanbanBoardService.updateColumn(id, dto);
  }

  @Delete('column/:id')
  deleteColumn(@Param('id', ParseIntPipe) id: number) {
    return this.kanbanBoardService.deleteStatusColumn(id);
  }
}
