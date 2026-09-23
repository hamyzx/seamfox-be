import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { MysteryService } from './mystery.service';
import { CreateMysteryDto } from './dto/create-mystery.dto';
import { CreateFullMysteryDto } from './dto/create-full-mystery.dto';
import { UpdateMysteryDto } from './dto/update-mystery.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { RecordAnswerDto } from './dto/record-answer.dto';
import { GetAllMysteryDto } from './dto/get-all-mystery.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { UpdateFullMysteryDto } from './dto/update-full-mystery.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('mystery')
export class MysteryController {
  constructor(private readonly mysteryService: MysteryService) {}

  @Post('full')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async createFullMystery(@Body() dto: CreateFullMysteryDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.mysteryService.createFullMystery(dto);
    return { data };
  }

  @Patch('full/:id')
  async updateFullMystery(
    @Param('id') id: number,
    @Body() dto: UpdateFullMysteryDto,
    @Req() req: Request,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.mysteryService.updateFullMystery(id, dto);
    return { data };
  }

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async createMystery(@Body() dto: CreateMysteryDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.mysteryService.createMystery(dto);
    return { data };
  }

  @Get()
  async findAllMysteries(@Query() query: GetAllMysteryDto) {
    const data = await this.mysteryService.findAllMysteries(query);
    return { data };
  }

  @Get('active')
  async getActiveMysteries() {
    const data = await this.mysteryService.getActiveMysteries();
    return { data };
  }

  @Get(':id')
  async findOneMystery(@Param('id') id: number) {
    const data = await this.mysteryService.findOneMystery(id);
    return { data };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateMystery(@Param('id') id: number, @Body() dto: UpdateMysteryDto, @Req() req: Request) {
    dto.updatedBy = req.user.id;
    const data = await this.mysteryService.updateMystery(id, dto);
    return { data };
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async deleteMystery(@Param('id') id: number, @Req() req: Request) {
    const data = await this.mysteryService.deleteMystery(id, req.user.id);
    return { data };
  }

  @Post(':mysteryId/option')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async addOption(
    @Param('mysteryId') mysteryId: number,
    @Body() dto: CreateOptionDto,
    @Req() req: Request,
  ) {
    dto.createdBy = req.user.id;
    const data = await this.mysteryService.addOption(mysteryId, dto);
    return { data };
  }

  @Patch(':mysteryId/option/:optionId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateOption(
    @Param('optionId') optionId: number,
    @Body() dto: UpdateOptionDto,
    @Req() req: Request,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.mysteryService.updateOption(optionId, dto);
    return { data };
  }

  @Delete(':mysteryId/option/:optionId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async deleteOption(@Param('optionId') optionId: number, @Req() req: Request) {
    const data = await this.mysteryService.deleteOption(optionId, req.user.id);
    return { data };
  }

  @Post(':mysteryId/attempt')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async createAttempt(
    @Param('mysteryId') mysteryId: number,
    @Body() dto: CreateAttemptDto,
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const data = await this.mysteryService.createAttempt(mysteryId, userId);
    return { data };
  }

  @Post(':mysteryId/attempt/answer')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async recordAnswer(
    @Param('mysteryId') mysteryId: number,
    @Body() dto: RecordAnswerDto,
    @Req() req: Request,
  ) {
    const data = await this.mysteryService.recordAnswer(mysteryId, dto, req.user.id);
    return { data };
  }

  @Get(':mysteryId/attempt')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async getUserAttempts(@Param('mysteryId') mysteryId: number, @Req() req: Request) {
    const data = await this.mysteryService.getUserAttempts(mysteryId, req.user.id);
    return { data };
  }

  // 🔥 NEW: Simple score submission — frontend sends { isCorrect: true/false }
  @Post(':mysteryId/submit-score')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async submitScore(
    @Param('mysteryId') mysteryId: number,
    @Body() body: { isCorrect: boolean },
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const data = await this.mysteryService.submitScore(mysteryId, userId, body);
    return { data };
  }
}