import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminJobService } from './admin-job.service';
import { CreateJobDto } from '../job/dto/create-job.dto';
import { UpdateJobDto } from '../job/dto/update-job.dto';
import { GetAllJobDto } from '../job/dto/get-all-job.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('admin/jobs')
export class AdminJobController {
  constructor(private readonly adminJobService: AdminJobService) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async create(@Body() dto: CreateJobDto, @Req() req: Request) {
    dto.createdByType = 'admin';
    dto.createdByAdminId = req.user.id;
    dto.createdBy = req.user.id;
    const data = await this.adminJobService.createAdminJob(dto);
    return { data, message: 'Admin job created successfully' };
  }

  @Get()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async findAll(@Query() query: GetAllJobDto) {
    const data = await this.adminJobService.findAllAdminJobs(query);
    return { data, message: 'Admin jobs fetched successfully' };
  }

  @Get(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async findOne(@Param('id') id: number) {
    const data = await this.adminJobService.findAdminJobById(+id);
    return { data, message: 'Admin job fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateJobDto,
    @Req() req: Request,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.adminJobService.updateAdminJob(+id, dto);
    return { data, message: 'Admin job updated successfully' };
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async remove(@Param('id') id: number, @Req() req: Request) {
    const data = await this.adminJobService.deleteAdminJob(+id, req.user.id);
    return { data, message: 'Admin job deleted successfully' };
  }

  @Get(':jobId/applications')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async getApplications(
    @Param('jobId') jobId: number,
    @Query() query: GetAllJobDto,
  ) {
    const data = await this.adminJobService.getAdminJobApplications(+jobId, query);
    return { data, message: 'Applications fetched successfully' };
  }
}
