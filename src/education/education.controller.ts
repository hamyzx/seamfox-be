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
import { CandidateService } from '../candidate/candidate.service';
import { EducationService } from './education.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { IResponse } from '../lib/interfaces/response.interface';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate/education')
export class EducationController {
  constructor(
    private readonly educationService: EducationService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async create(@Body() dto: CreateEducationDto, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    const data = await this.educationService.create(dto);
    return { data };
  }

  @Get(':candidateId')
  async findByCandidate(
    @Param('candidateId', ParseIntPipe) candidateId: number,
  ): Promise<IResponse> {
    const data = await this.educationService.findByCandidate(candidateId);
    return { data, message: 'Education fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEducationDto,
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    return this.educationService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? null
        : (await this.candidateService.findByUserId(userId))?.id;
    return this.educationService.remove(id, candidateId);
  }
}
