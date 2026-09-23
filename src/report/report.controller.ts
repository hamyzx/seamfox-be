import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { ReportStatus } from './entities/report.entity';

@UseGuards(AuthGuard, RolesGuard)
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // Company reports a candidate
  @Post()
  @Roles(UserRoles.COMPANY)
  async create(@Body() dto: CreateReportDto, @Req() req: Request) {
    const data = await this.reportService.create(req.user.id, dto);
    return { data, message: 'Report submitted successfully' };
  }

  // Admin — get all reports
  @Get()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: ReportStatus,
  ) {
    const data = await this.reportService.findAll(+page, +limit, status);
    return { data, message: 'Reports fetched successfully' };
  }

  // Admin — get single report
  @Get(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.reportService.findOne(id);
    return { data, message: 'Report fetched successfully' };
  }

  // Admin — update report status / add note
  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportDto,
  ) {
    const data = await this.reportService.updateStatus(id, dto);
    return { data, message: 'Report updated successfully' };
  }

  // Admin — ban candidate from a report
  @Patch(':id/ban')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async banCandidate(
    @Param('id', ParseIntPipe) id: number,
    @Body('adminNote') adminNote?: string,
  ) {
    const data = await this.reportService.banCandidate(id, adminNote);
    return { data, message: 'Candidate banned successfully' };
  }

  // Admin — unban by userId
  @Patch('unban/:userId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async unbanCandidate(@Param('userId') userId: string) {
    const data = await this.reportService.unbanCandidate(userId);
    return { data, message: 'Candidate unbanned successfully' };
  }

  // Admin — get all reports for a specific candidate
  @Get('candidate/:candidateId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async getByCandidate(@Param('candidateId', ParseIntPipe) candidateId: number) {
    const data = await this.reportService.getReportsByCandidate(candidateId);
    return { data, message: 'Reports fetched successfully' };
  }
}