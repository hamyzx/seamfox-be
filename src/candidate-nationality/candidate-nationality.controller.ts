import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CandidateNationalityService } from './candidate-nationality.service';
import { CreateCandidateNationalityDto } from './dto/create-candidate-nationality.dto';
import { UpdateCandidateNationalityDto } from './dto/update-candidate-nationality.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { CandidateService } from '../candidate/candidate.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate-nationality')
export class CandidateNationalityController {
  constructor(
    private readonly candidateNationalityService: CandidateNationalityService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async addNationality(@Body() dto: CreateCandidateNationalityDto, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    return this.candidateNationalityService.create(dto);
  }

  @Get('candidate/:candidateId')
  async findByCandidate(@Param('candidateId') candidateId: number) {
    return this.candidateNationalityService.findByCandidate(candidateId);
  }

  @Get(':id/candidate/:candidateId')
  async findOne(@Param('id') id: number, @Param('candidateId') candidateId: number) {
    return this.candidateNationalityService.findOne(id, candidateId);
  }

  @Patch(':id')
  async updateNationality(@Param('id') id: number, @Body() dto: UpdateCandidateNationalityDto) {
    return this.candidateNationalityService.update(id, dto);
  }

  @Delete(':id')
  async removeNationality(@Param('id') id: number, @Query('candidateId') candidateId?: number) {
    return this.candidateNationalityService.remove(id, candidateId ?? null);
  }
}
