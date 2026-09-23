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
import { SocialProfileService } from './social-profile.service';
import { CreateSocialProfileDto } from './dto/create-social-profile.dto';
import { UpdateSocialProfileDto } from './dto/update-social-profile.dto';
import { IResponse } from '../lib/interfaces/response.interface';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate/social-profile')
export class SocialProfileController {
  constructor(
    private readonly socialProfileService: SocialProfileService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async create(@Body() dto: CreateSocialProfileDto, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    return this.socialProfileService.create(dto);
  }

  @Get(':candidateId')
  async findByCandidate(
    @Param('candidateId', ParseIntPipe) candidateId: number,
  ): Promise<IResponse> {
    const data = await this.socialProfileService.findByCandidate(candidateId);
    return { data, message: 'Social Profile fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSocialProfileDto,
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    return this.socialProfileService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? null
        : (await this.candidateService.findByUserId(userId))?.id;
    return this.socialProfileService.remove(id, candidateId);
  }
}
