import {
  Controller,
  Get,
  Post,
  Req,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreateFullQuizDto } from './dto/create-complete-quiz.dto';
import { UpdateFullQuizDto } from './dto/update-complete-quiz.dto';
import { GetAllQuizDto } from './dto/get-all-quiz.dto';
import { RecordAnswerDto } from './dto/record-answer.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // QUIZ

  @Post('full')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async createFullQuiz(@Body() dto: CreateFullQuizDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.quizService.createFullQuiz(dto);
    return { data };
  }

  @Patch('full/:id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateFullQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFullQuizDto,
    @Req() req: Request,
  ) {
    dto.updatedBy = req.user.id;
    const data = await this.quizService.updateFullQuiz(id, dto);
    return { data };
  }

  @Post()
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async createQuiz(@Body() dto: CreateQuizDto, @Req() req: Request) {
    dto.createdBy = req.user.id;
    const data = await this.quizService.createQuiz(dto);
    return { data };
  }

  @Get()
  async findAll(@Query() query: GetAllQuizDto) {
    const data = await this.quizService.findAllQuizzes(query);
    return { data, message: 'Data fetched successfully' };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.quizService.findOneQuiz(id);
    return { data, message: 'Data fetched successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateQuiz(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuizDto) {
    const data = await this.quizService.updateQuiz(id, dto);
    return { data, message: 'Data updated successfully' };
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async removeQuiz(@Param('id', ParseIntPipe) id: number) {
    const data = await this.quizService.deleteQuiz(id);
    return { data };
  }

  // QUESTIONS
  @Post(':quizId/question')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async addQuestion(@Param('quizId', ParseIntPipe) quizId: number, @Body() dto: CreateQuestionDto) {
    const data = await this.quizService.addQuestion(quizId, dto);
    return { data };
  }

  @Patch(':quizId/question/:questionId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateQuestion(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    const data = await this.quizService.updateQuestion(questionId, dto);
    return { data };
  }

  @Delete(':quizId/question/:questionId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async removeQuestion(@Param('questionId', ParseIntPipe) questionId: number) {
    const data = await this.quizService.deleteQuestion(questionId);
    return { data };
  }

  // OPTIONS
  @Post(':quizId/question/:questionId/option')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async addOption(
    @Param('questionId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: CreateOptionDto,
  ) {
    const data = await this.quizService.addOption(questionId, dto);
    return { data };
  }

  @Patch(':quizId/question/option/:optionId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async updateOption(
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body() dto: UpdateOptionDto,
  ) {
    const data = await this.quizService.updateOption(optionId, dto);
    return { data, message: 'Data updated successfully' };
  }

  @Delete(':quizId/question/option/:optionId')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async removeOption(@Param('optionId', ParseIntPipe) optionId: number) {
    const data = await this.quizService.deleteOption(optionId);
    return { data };
  }

  // ATTEMPTS
  @Post(':quizId/attempt')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async createAttempt(@Param('quizId', ParseIntPipe) quizId: number, @Req() req: Request) {
    const userId = req.user.id;
    const data = await this.quizService.createAttempt(quizId, userId);
    return { data };
  }

  @Post(':quizId/attempt/answer/:questionId')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async recordAnswer(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: RecordAnswerDto,
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const data = await this.quizService.recordAnswer(quizId, questionId, dto, userId);
    return { data };
  }

  // 🔥 NEW: Simple score submission — frontend sends correctCount & totalQuestions
  @Post(':quizId/submit-score')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async submitScore(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() body: { correctCount: number; totalQuestions: number },
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    const data = await this.quizService.submitScore(quizId, userId, body);
    return { data };
  }
}