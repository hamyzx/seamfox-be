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
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { GetAllJobDto } from './dto/get-all-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import {JobStatus } from '../lib/enums/job.enum';


@UseGuards(AuthGuard, RolesGuard)
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  // Job Title Endpoints
  @Post('title')
  @Roles(UserRoles.SUPER_ADMIN)
  async createJobTitle(@Body() dto: CreateJobTitleDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.jobService.createJobTitle(dto);
    return { data };
  }

  @Get('title')
  async findAllJobTitle(@Query() query: GetAllJobDto) {
    const data = await this.jobService.findAllJobTitle(query);
    return { data, message: 'Data Fetched successfully' };
  }

  @Patch('title/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async updateJobTitle(
    @Param('id') id: number,
    @Body() dto: UpdateJobTitleDto,
    @Req() req: Request,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.jobService.updateJobTitle(+id, dto);
    return { data, message: 'Data Updated successfully' };
  }

  @Delete('title/:id')
  @Roles(UserRoles.SUPER_ADMIN)
  async removeJobTitle(@Param('id') id: number, @Req() req: Request) {
    const data = await this.jobService.removeJobTitle(+id, req.user.id);
    return { data, message: 'Data Deleted successfully' };
  }

  // Job Endpoints
  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY)
  async create(@Body() dto: CreateJobDto, @Req() req: Request) {
    dto.companyId = req.user.role === UserRoles.SUPER_ADMIN ? dto.companyId : req.user.companyId;
    dto.createdBy = req.user.id;
    const data = await this.jobService.create(dto);
    return { data };
  }

  @Get()
  async findAll(@Query() query: GetAllJobDto, @Req() req: Request) {
    const userId = req.user.id;
    const data = await this.jobService.findAll(query, userId);
    return { data, message: 'Data Fetched successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: number, @Req() req: Request) {
    const userId = req.user?.candidateId;
    const data = await this.jobService.findOne(id, userId);
    return { data, message: 'Data Fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY)
  async update(@Param('id') id: number, @Body() dto: UpdateJobDto, @Req() req: Request) {
    dto.companyId = req.user.role === UserRoles.SUPER_ADMIN ? dto.companyId : req.user.companyId;
    dto.updatedBy = req.user.id;
    const data = await this.jobService.update(id, dto);
    return { data, message: 'Data Updated successfully' };
  }

  @Get('company/:companyId')
  async findJobsByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('candidateId') candidateId?: string,
  ) {
    const data = await this.jobService.findJobsByCompany(companyId, candidateId);
    return { data, message: 'Company jobs fetched successfully' };
  }

  @Get('list/:companyId')
  async listJobsByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('candidateId') candidateId?: string,
  ) {
    const data = await this.jobService.listJobsByCompany(companyId, candidateId);
    return { data, message: 'Company jobs fetched successfully' };
  }

  @Patch(':id/status')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY)
  async updateJobStatus(
    @Param('id') id: number,
    @Body('status') status: JobStatus,
    @Req() req: Request,
  ) {
    const companyId =
      req.user.role === UserRoles.SUPER_ADMIN ? req.body.companyId : req.user.companyId;

    const data = await this.jobService.updateJobStatus(+id, status, companyId, req.user.id);

    return { data, message: 'Job status updated successfully' };
  }

  

}

