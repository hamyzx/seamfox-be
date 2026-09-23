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
import { SkillService } from './skill.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { IResponse } from '../lib/interfaces/response.interface';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate/skill')
export class SkillController {
  constructor(
    private readonly skillService: SkillService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async create(@Body() dto: CreateSkillDto, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    const data = await this.skillService.create(dto);
    return { data };
  }

  @Get(':candidateId')
  async findByCandidate(
    @Param('candidateId', ParseIntPipe) candidateId: number,
  ): Promise<IResponse> {
    const data = await this.skillService.findByCandidate(candidateId);
    return { data, message: 'Certificates fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSkillDto,
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    return this.skillService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? null
        : (await this.candidateService.findByUserId(userId))?.id;
    return this.skillService.remove(id, candidateId);
  }
}
