import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminKanbanService } from './admin-kanban.service';
import { UpdateApplicationDto } from '../application/dto/update-application.dto';
import { GetAllApplicationDto } from '../application/dto/get-all-application.dto';
import { CreateKanbanColumnDto } from '../company/kanban-board/dto/create-kanban-column.dto';
import { UpdateKanbanColumnDto } from '../company/kanban-board/dto/update-kanban-column.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('admin')
export class AdminKanbanController {
  constructor(private readonly adminKanbanService: AdminKanbanService) {}

  @Get('kanban/:jobId')
  @Roles(UserRoles.SUPER_ADMIN)
  async getKanbanBoard(@Param('jobId') jobId: number) {
    const data = await this.adminKanbanService.getAdminKanbanBoard(+jobId);
    return { data, message: 'Kanban board fetched successfully' };
  }

  @Get('jobs/:jobId/applications')
  @Roles(UserRoles.SUPER_ADMIN)
  async getApplications(
    @Param('jobId') jobId: number,
    @Query() query: GetAllApplicationDto,
  ) {
    const data = await this.adminKanbanService.getAdminJobApplications(+jobId, query);
    return { data, message: 'Applications fetched successfully' };
  }

  @Patch('applications/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async updateApplicationStatus(
    @Param('id') id: number,
    @Body() dto: UpdateApplicationDto,
  ) {
    const data = await this.adminKanbanService.updateApplicationStatus(+id, dto);
    return { data, message: 'Application status updated successfully' };
  }

  @Post('applications/:id/comments')
  @Roles(UserRoles.SUPER_ADMIN)
  async addComment(
    @Param('id') id: number,
    @Body('comment') comment: string,
    @Req() req: Request,
  ) {
    const data = await this.adminKanbanService.addApplicationComment(
      +id,
      comment,
      req.user.id,
    );
    return { data, message: 'Comment added successfully' };
  }

  @Post('kanban/column')
  @Roles(UserRoles.SUPER_ADMIN)
  async addColumn(@Body() dto: CreateKanbanColumnDto) {
    const data = await this.adminKanbanService.addColumn(dto);
    return { data, message: 'Column added successfully' };
  }

  @Patch('kanban/column/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async updateColumn(
    @Param('id') id: number,
    @Body() dto: UpdateKanbanColumnDto,
  ) {
    const data = await this.adminKanbanService.updateColumn(+id, dto);
    return { data, message: 'Column updated successfully' };
  }

  @Delete('kanban/column/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async deleteColumn(@Param('id') id: number) {
    const data = await this.adminKanbanService.deleteColumn(+id);
    return { data, message: 'Column deleted successfully' };
  }

  @Get('kanban/core/status')
  @Roles(UserRoles.SUPER_ADMIN)
  async getCoreStatus() {
    const data = await this.adminKanbanService.getCoreStatus();
    return { data, message: 'Core statuses fetched successfully' };
  }
}