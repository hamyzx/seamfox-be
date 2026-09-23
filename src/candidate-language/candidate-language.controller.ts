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
import { CandidateLanguageService } from './candidate-language.service';
import { CreateCandidateLanguageDto } from './dto/create-candidate-language.dto';
import { CandidateService } from '../candidate/candidate.service';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate-language')
export class CandidateLanguageController {
  constructor(
    private readonly candidateLanguageService: CandidateLanguageService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async create(@Body() dto: CreateCandidateLanguageDto, @Req() req: Request) {
    const userId = req.user.id;
    const candidateId =
      req.user.role === UserRoles.SUPER_ADMIN
        ? dto.candidateId
        : (await this.candidateService.findByUserId(userId))?.id;
    dto.candidateId = candidateId;
    return this.candidateLanguageService.create(dto);
  }

  // GET → Get by ID
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.candidateLanguageService.findOne(id);
  }

  // PATCH → Update by ID
  @Patch(':id')
  updateLanguage(@Param('id') id: number, @Body() dto: Partial<CreateCandidateLanguageDto>) {
    return this.candidateLanguageService.updateLanguage(id, dto);
  }

  // DELETE → Remove a record
  @Delete(':id')
  remove(@Param('id') id: number, @Query('candidateId') candidateId?: number) {
    return this.candidateLanguageService.remove(id, candidateId ?? null);
  }
}
