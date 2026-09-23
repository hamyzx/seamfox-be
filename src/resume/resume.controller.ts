import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { CandidateService } from '../candidate/candidate.service';
import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { IResponse } from '../lib/interfaces/response.interface';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate/resume')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async create(@Body() dto: CreateResumeDto, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    console.log(candidateId);
    const data = await this.resumeService.create(dto);
    return { data };
  }

  @Get(':candidateId')
  async findByCandidate(
    @Param('candidateId', ParseIntPipe) candidateId: number,
  ): Promise<IResponse> {
    const data = await this.resumeService.findByCandidate(candidateId);
    return { data, message: 'Resume fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.CANDIDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResumeDto,
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const candidateId = (await this.candidateService.findByUserId(userId))?.id;
    return this.resumeService.updateResumeDefault(id, candidateId);
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? null
        : (await this.candidateService.findByUserId(userId))?.id;
    return this.resumeService.remove(id, candidateId);
  }
}
