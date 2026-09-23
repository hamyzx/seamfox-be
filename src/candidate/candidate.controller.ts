import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CandidateService } from './candidate.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { GetAllCandidateDto } from './dto/get-all-candidate.dto';
import { IResponse } from '../lib/interfaces/response.interface';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { CandidateStatus } from '../lib/enums/candidate.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async create(@Body() dto: CreateCandidateDto, @Req() req: Request) {
    const userId = req.user.role === UserRoles.SUPER_ADMIN ? dto.userId : req.user.id;
    const data = await this.candidateService.create({ ...dto, userId });
    return { data };
  }

  @Get()
  async findAll(@Query() query: GetAllCandidateDto, @Req() req: Request): Promise<IResponse> {
    const data = await this.candidateService.findAll(query, req.user);
    return { data, message: 'Data fetched successfully' };
  }

  
  @Get('me')
  @Roles(UserRoles.CANDIDATE)
  async findMe(@Req() req: Request): Promise<IResponse> {
    const data = await this.candidateService.getMyProfile(req.user.id);
    return { data, message: 'Profile fetched successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<IResponse> {
    let companyUser;
    const numId = Number(id);

    if (req.user.role === UserRoles.COMPANY) {
      companyUser = {
        companyId: req.user.companyId,
        userId: req.user.id,
        role: req.user.role,
      };
    }

    const data = await this.candidateService.findOne(numId, companyUser);
    return { data, message: 'Data fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCandidateDto,
    @Req() req: Request,
  ) {
    if (req.user.role === UserRoles.CANDIDATE) {
      const candidate = await this.candidateService.findOne(id, req.user);
      if (candidate.userId !== req.user.id) {
        throw new ForbiddenException('You can only update your own candidate record');
      }


      if (
        candidate.status === CandidateStatus.REQUEST_CHANGE ||
        candidate.status === CandidateStatus.REJECTED
      ) {
        (dto as any).status = CandidateStatus.UNDER_REVIEW;
      } else {
        delete (dto as any).status;
      }
    }

    const adminId = req.user.role === UserRoles.SUPER_ADMIN ? req.user.id : undefined;
    const data = await this.candidateService.update(id, dto, adminId);
    return { data };
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.CANDIDATE)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    if (req.user.role === UserRoles.CANDIDATE) {
      const candidate = await this.candidateService.findOne(id);
      if (candidate.userId !== req.user.id) {
        throw new ForbiddenException('You can only delete your own candidate record');
      }
    }
    return this.candidateService.remove(id);
  }
}