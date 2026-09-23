import { generateLayout } from 'crossword-layout-generator';
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CrosswordService } from './cross-word.service';
import { CreateCrosswordDto } from './dto/create-crossword.dto';
import { UpdateCrosswordDto } from './dto/update-crossword.dto';
import { CreateClueDto } from './dto/create-clue.dto';
import { UpdateClueDto } from './dto/update-clue.dto';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreateFullCrosswordDto } from './dto/create-full-crossword.dto';
import { UpdateFullCrosswordDto } from './dto/update-full-crossword.dto';
import { RecordAnswerDto } from './dto/record-answer.dto';
import { GetAllCrosswordDto } from './dto/get-all-crossword.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('crossword')
export class CrosswordController {
  constructor(private readonly crosswordService: CrosswordService) {}

  @Post('full')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async createFullCrossword(@Body() dto: CreateFullCrosswordDto, @Req() req) {
    dto.createdBy = req.user.id;
    const data = await this.crosswordService.createFullCrossword(dto);
    return { data };
  }

  @Patch('full/:id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateFullCrossword(
    @Param('id') id: number,
    @Body() dto: UpdateFullCrosswordDto,
    @Req() req,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.crosswordService.updateFullCrossword(id, dto);
    return { data };
  }

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async create(@Body() dto: CreateCrosswordDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.crosswordService.createCrossword(dto);
    return { data };
  }

  @Get()
  async findAll(@Query() query: GetAllCrosswordDto) {
    const data = await this.crosswordService.findAllCrosswords(query);
    return { data };
  }

  @Get(':crosswordId')
  async findOne(@Param('crosswordId') id: number) {
    const data = await this.crosswordService.findOne(id);
    return { data };
  }

  @Patch(':crosswordId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async update(
    @Param('crosswordId') id: number,
    @Body() dto: UpdateCrosswordDto,
    @Req() req: Request,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.crosswordService.updateCrossword(id, dto);
    return { data };
  }

  @Delete(':crosswordId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async remove(@Param('crosswordId') id: number, @Req() req: Request) {
    const data = await this.crosswordService.removeCrossword(id, req.user.id);
    return { data };
  }

  @Post(':crosswordId/clue')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async addClue(
    @Param('crosswordId') crosswordId: number,
    @Body() dto: CreateClueDto,
    @Req() req: Request,
  ) {
    dto.createdBy = req.user.id;
    const data = await this.crosswordService.addClue(crosswordId, dto);
    return { data };
  }

  @Patch(':crosswordId/clue/:clueId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateClue(
    @Param('clueId') clueId: number,
    @Body() dto: UpdateClueDto,
    @Req() req: Request,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.crosswordService.updateClue(clueId, dto);
    return { data };
  }

  @Delete(':crosswordId/clue/:clueId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async removeClue(@Param('clueId') clueId: number, @Req() req: Request) {
    const data = await this.crosswordService.removeClue(clueId, req.user.id);
    return { data };
  }

  @Post(':crosswordId/attempt')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async createAttempt(@Param('crosswordId') crosswordId: number, @Req() req: Request) {
    const userId = req.user.id;
    const data = await this.crosswordService.createAttempt(crosswordId, userId);
    return { data };
  }

  @Post(':crosswordId/attempt/answer')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async recordAnswer(
    @Param('crosswordId') crosswordId: number,
    @Body() dto: RecordAnswerDto,
    @Req() req: Request,
  ) {
    const data = await this.crosswordService.recordAnswer(crosswordId, dto, req.user.id);
    return { data };
  }

  @Get(':crosswordId/attempts')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async getAttempts(@Param('crosswordId') crosswordId: number, @Req() req: Request) {
    const data = await this.crosswordService.getUserAttempts(crosswordId, req.user.id);
    return { data };
  }

  // 🔥 NEW: Simple score submission — frontend sends { isCompleted: true/false }
  @Post(':crosswordId/submit-score')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async submitScore(
    @Param('crosswordId') crosswordId: number,
    @Body() body: { isCompleted: boolean },
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const data = await this.crosswordService.submitScore(crosswordId, userId, body);
    return { data };
  }

  @Post('generate')
  async generate() {
    const entries = [
      { answer: 'Arslan', clue: 'Name of a person' },
      { answer: 'Australia', clue: 'Name of a country' },
      { answer: 'America', clue: 'Name of a country' },
    ];

    const sanitized = entries.map((e) => ({
      clue: e.clue,
      answer: String(e.answer).toUpperCase(),
    }));

    const layout = generateLayout(sanitized);
    const data = this.convertToReactCrossword(layout.result);
    return { data };
  }

  convertToReactCrossword(result) {
    const across = {};
    const down = {};

    result.forEach((entry) => {
      const obj = {
        clue: entry.clue,
        answer: entry.answer,
        row: entry.starty - 1,
        col: entry.startx - 1,
      };

      if (entry.orientation === 'across') {
        across[entry.position] = obj;
      } else {
        down[entry.position] = obj;
      }
    });

    return { across, down };
  }
}