import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  ParseIntPipe,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { InterestService } from './interest.service';
import { CreateInterestDto } from './dto/create-interest.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { GetAllInterestsDto } from './dto/get-all-interest.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('interest')
export class InterestController {
  constructor(private readonly interestService: InterestService) {}

  @Post()
  @Roles(UserRoles.COMPANY)
  async create(@Body() dto: CreateInterestDto, @Req() req: Request) {
    dto.companyId = req.user.companyId;
    const senderId = req.user.id;
    const data = await this.interestService.create(dto, senderId);
    return { data };
  }

  @Post('job')
  @Roles(UserRoles.CANDIDATE)
  async createCompany(@Body() dto: CreateInterestDto, @Req() req: Request) {
    dto.candidateId = req.user.candidateId;
    const senderId = req.user.id;
    const data = await this.interestService.createJobInterest(dto, senderId);
    return { data };
  }

  @Get()
  async findAll(@Query() query: GetAllInterestsDto) {
    const data = await this.interestService.findAll(query);
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.interestService.findOne(id);
    return { data };
  }

  @Patch(':id')
  @Roles(UserRoles.CANDIDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInterestDto: UpdateInterestDto,
    @Req() req: Request,
  ) {
    updateInterestDto.candidateId = req.user.candidateId;
    const data = await this.interestService.update(id, updateInterestDto);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.interestService.remove(id);
    return { data };
  }
}
