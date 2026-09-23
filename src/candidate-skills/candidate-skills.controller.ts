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
import { CandidateSkillService } from './candidate-skills.service';
import { CreateCandidateSkillDto } from './dto/create-candidate-skills.dto';
import { UpdateCandidateSkillDto } from './dto/update-candidate-skills.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { CandidateService } from '../candidate/candidate.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate-skill')
export class CandidateSkillController {
  constructor(
    private readonly candidateSkillService: CandidateSkillService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async addSkill(@Body() dto: CreateCandidateSkillDto, @Req() req: Request) {
    const userId = req.user.id;

    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;

    dto.candidateId = candidateId;

    return this.candidateSkillService.create(dto);
  }

  @Get('candidate/:candidateId')
  async findByCandidate(@Param('candidateId') candidateId: number) {
    return this.candidateSkillService.findByCandidate(candidateId);
  }

  @Get(':id/candidate/:candidateId')
  async findOne(
    @Param('id') id: number,
    @Param('candidateId') candidateId: number,
  ) {
    return this.candidateSkillService.findOne(id, candidateId);
  }

  @Patch(':id')
  async updateSkill(
    @Param('id') id: number,
    @Body() dto: UpdateCandidateSkillDto,
  ) {
    return this.candidateSkillService.update(id, dto);
  }

  @Delete(':id')
  async removeSkill(
    @Param('id') id: number,
    @Query('candidateId') candidateId?: number,
  ) {
    return this.candidateSkillService.remove(id, candidateId ?? null);
  }
}
