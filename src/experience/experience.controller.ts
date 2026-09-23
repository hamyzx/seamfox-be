import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ExperienceProvider } from './experience.provider';
import { CreateExperienceDto, UpdateExperienceDto } from './dto/experience.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthGuard } from '../lib/guards/auth.guard';

import { Roles, RolesGuard } from '../lib/guards/roles.guard';

import { UserRoles } from '../lib/enums/user.enum';

@Controller('experience')
@UseGuards(AuthGuard, RolesGuard)
export class ExperienceController {
  constructor(private readonly provider: ExperienceProvider) {}

  // Create a single experience (post-onboarding)
  @Post()
  @Roles(UserRoles.CANDIDATE)
  async create(@Req() req: any, @Body() dto: CreateExperienceDto) {
    return this.provider.create(req.user.id, dto);
  }

  // Bulk create (used in onboarding when user adds multiple jobs at once)
  @Post('bulk')
  @Roles(UserRoles.CANDIDATE)
  async bulkCreate(@Req() req: any, @Body() dtos: CreateExperienceDto[]) {
    return this.provider.bulkCreate(req.user.id, dtos);
  }

  // Get all experiences for current logged-in candidate
  @Get('me')
  @Roles(UserRoles.CANDIDATE)
  async findMine(@Req() req: any) {
    return this.provider.findAllForUser(req.user.id);
  }

  // Get all experiences for a specific candidate (public profile / admin)
  @Get('candidate/:candidateId')
  async findByCandidate(@Param('candidateId', ParseIntPipe) candidateId: number) {
    return this.provider.findAllByCandidateId(candidateId);
  }

  // Get single
  @Get(':id')
  @Roles(UserRoles.CANDIDATE)
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.provider.findOne(req.user.id, id);
  }

  // Update
  @Patch(':id')
  @Roles(UserRoles.CANDIDATE)
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.provider.update(req.user.id, id, dto);
  }

  // Delete
  @Delete(':id')
  @Roles(UserRoles.CANDIDATE)
  async delete(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.provider.delete(req.user.id, id);
  }
}