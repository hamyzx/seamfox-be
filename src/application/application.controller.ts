import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { GetAllApplicationDto } from './dto/get-all-application.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { SendInterviewEmailDto } from './dto/send-interview-email.dto';
import { ShortlistApplicationDto } from './dto/shortlist-application.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) { }

  // POST — Candidate applies
  @Post()
  @Roles(UserRoles.CANDIDATE)
  create(@Body() dto: CreateApplicationDto, @Req() req: Request) {
    dto.candidateId = req.user.candidateId;
    return this.applicationService.create(dto, req.user.id);
  }

  // POST — Company adds candidate to review list (job selection modal)
  @Post('company')
  @Roles(UserRoles.COMPANY)
  createByCompany(@Body() dto: CreateApplicationDto, @Req() req: Request) {
    return this.applicationService.createByCompany(dto, req.user.id);
  }

  // POST — Company shortlists a candidate (auto Shortlist column in kanban)
  @Post('shortlist')
  @Roles(UserRoles.COMPANY)
  async shortlist(@Body() dto: ShortlistApplicationDto, @Req() req: Request) {
    const data = await this.applicationService.shortlistCandidate(dto, req.user.id);
    return { data, message: 'Candidate shortlisted successfully' };
  }

  // POST — Send interview email
  @Post('send-interview-email')
  @Roles(UserRoles.SUPER_ADMIN)
  async sendInterviewEmail(@Body() dto: SendInterviewEmailDto) {
    const data = await this.applicationService.sendInterviewEmail(dto);
    return { data, message: 'Interview email sent successfully' };
  }

  @Get('applied/:id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY, UserRoles.MODERATOR)
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.applicationService.findApplicationById(id);
    return { data, message: 'Application fetched successfully' };
  }

  @Get('company/:companyId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY, UserRoles.MODERATOR)
  async findByCompanyId(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: GetAllApplicationDto,
    @Req() req: Request,
  ) {
    companyId = req.user.role === UserRoles.COMPANY ? req.user.companyId : companyId;
    const data = await this.applicationService.findApplicationsByCompany(companyId, query);
    return { data, message: 'Data Fetched successfully' };
  }

  @Get('job/:jobId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.COMPANY, UserRoles.MODERATOR)
  async findByJobId(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Query() query: GetAllApplicationDto,
  ) {
    const data = await this.applicationService.findApplicationsByJob(jobId, query);
    return { data, message: 'Data Fetched successfully' };
  }

  @Get(':candidateId')
  async findByCandidate(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Query() query: GetAllApplicationDto,
  ) {
    const data = await this.applicationService.findByCandidate(candidateId, query);
    return { data, message: 'Data Fetched successfully' };
  }

  @Patch(':id/remove-from-kanban')
  @Roles(UserRoles.COMPANY, UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async removeFromKanban(@Param('id', ParseIntPipe) id: number) {
    const data = await this.applicationService.removeFromKanban(id);
    return { data, message: 'Candidate removed from kanban' };
  }

  @Patch(':id')
  @Roles(UserRoles.COMPANY)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationDto,
  ) {
    const data = await this.applicationService.updateStatus(id, dto);
    return { data, message: 'Data Updated successfully' };
  }

  @Delete(':id/withdraw')
  @Roles(UserRoles.CANDIDATE)
  async withdraw(@Param('id') id: number, @Req() req: Request) {
    const data = await this.applicationService.withdrawApplication(+id, req.user.candidateId);
    return { data, message: 'Application withdrawn successfully' };
  }
}