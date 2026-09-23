import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizQuestionOption } from './entities/quiz-question-option.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAttemptAnswer } from './entities/quiz-attempt-answer.entity';

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
import { handleDBError } from '../lib/error/dataBaseError';
import { DataSource, Between } from 'typeorm';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,

    @InjectRepository(QuizQuestion)
    private readonly questionRepo: Repository<QuizQuestion>,

    @InjectRepository(QuizQuestionOption)
    private readonly optionRepo: Repository<QuizQuestionOption>,

    @InjectRepository(QuizAttempt)
    private readonly attemptRepo: Repository<QuizAttempt>,

    @InjectRepository(QuizAttemptAnswer)
    private readonly answerRepo: Repository<QuizAttemptAnswer>,

    private readonly dataSource: DataSource,
  ) {}

  // ---------------- QUIZ CRUD ----------------
  async createQuiz(dto: CreateQuizDto) {
    try {
      const quiz = this.quizRepo.create(dto);
      return await this.quizRepo.save(quiz);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAllQuizzes(query: GetAllQuizDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', filters, search } = query;

      const qb = this.quizRepo
        .createQueryBuilder('quiz')
        .leftJoinAndSelect('quiz.questions', 'question')
        .leftJoinAndSelect('question.options', 'option')
        .leftJoin('quiz.attempts', 'attempt')
        .loadRelationCountAndMap('quiz.totalAttemptCount', 'quiz.attempts')
        .select([
          'quiz.id',
          'quiz.title',
          'quiz.description',
          'quiz.timeLimit',
          'quiz.createdAt',
          'quiz.updatedAt',
          'quiz.createdBy',
          'quiz.updatedBy',
          'question',
          'option',
        ]);

      if (search) {
        qb.andWhere('(LOWER(quiz.title) LIKE :search OR LOWER(quiz.description) LIKE :search)', {
          search: `%${search.toLowerCase()}%`,
        });
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`quiz.${field} = :${field}`, {
            [field]: filters[field],
          });
        });
      }

      qb.orderBy(`quiz.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

      if (limit && page) {
        qb.skip((+page - 1) * +limit).take(+limit);
      }

      const [data, total] = await qb.getManyAndCount();

      return {
        data,
        total,
        page: +page,
        limit: +limit,
      };
    } catch (error) {
      handleDBError(error);
    }
  }

  async findOneQuiz(id: number) {
    const quiz = await this.quizRepo.findOne({
      where: { id },
      relations: ['questions', 'questions.options'],
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async updateQuiz(id: number, dto: UpdateQuizDto) {
    try {
      await this.quizRepo.update(id, dto);
      return this.findOneQuiz(id);
    } catch (error) {
      handleDBError(error);
    }
  }

  async deleteQuiz(id: number) {
    try {
      return await this.quizRepo.delete(id);
    } catch (error) {
      handleDBError(error);
    }
  }

  // ---------------- QUESTION CRUD ----------------
  async addQuestion(quizId: number, dto: CreateQuestionDto) {
    try {
      const question = this.questionRepo.create({ ...dto, quizId });
      return await this.questionRepo.save(question);
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateQuestion(questionId: number, dto: UpdateQuestionDto) {
    try {
      await this.questionRepo.update(questionId, dto);
      return this.questionRepo.findOne({ where: { id: questionId } });
    } catch (error) {
      handleDBError(error);
    }
  }

  async deleteQuestion(questionId: number) {
    try {
      return await this.questionRepo.delete(questionId);
    } catch (error) {
      handleDBError(error);
    }
  }

  // ---------------- OPTION CRUD ----------------
  async addOption(questionId: number, dto: CreateOptionDto) {
    try {
      const option = this.optionRepo.create({ ...dto, questionId });
      return await this.optionRepo.save(option);
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateOption(optionId: number, dto: UpdateOptionDto) {
    try {
      const option = await this.optionRepo.update(optionId, dto);
      return this.optionRepo.findOne({ where: { id: optionId } });
    } catch (error) {
      handleDBError(error);
    }
  }

  async deleteOption(optionId: number) {
    try {
      const option = await this.optionRepo.findOneBy({ id: optionId });
      if (!option) {
        throw new NotFoundException('Provided option not found');
      }
      return await this.optionRepo.remove(option);
    } catch (error) {
      handleDBError(error);
    }
  }

  // ---------------- ATTEMPT ----------------
  async createAttempt(quizId: number, userId: string) {
    try {
      const quiz = await this.quizRepo.findOne({ where: { id: quizId } });

      if (!quiz) {
        throw new NotFoundException('Quiz not found');
      }

      const startedAt = new Date();

      const expiredAt = quiz.timeLimit
        ? new Date(startedAt.getTime() + quiz.timeLimit * 1000)
        : null;

      const attempt = this.attemptRepo.create({
        quizId,
        userId,
        startedAt,
        expiredAt,
      } as Partial<QuizAttempt>);

      return await this.attemptRepo.save(attempt);
    } catch (error) {
      handleDBError(error);
    }
  }

  // 🔥 NEW: Simple score submission — frontend sends correctCount & total
  async submitScore(
    quizId: number,
    userId: string,
    body: { correctCount: number; totalQuestions: number },
  ) {
    try {
      const { correctCount, totalQuestions } = body;

      if (
        typeof correctCount !== 'number' ||
        typeof totalQuestions !== 'number' ||
        totalQuestions <= 0 ||
        correctCount < 0 ||
        correctCount > totalQuestions
      ) {
        throw new BadRequestException('Invalid score payload');
      }

      const quiz = await this.quizRepo.findOne({ where: { id: quizId } });
      if (!quiz) throw new NotFoundException('Quiz not found');

      // 🔥 FIXED: 10 points total, proportional to correct answers
      const MAX_POINTS = 10;
      const earnPoint = Math.floor((correctCount / totalQuestions) * MAX_POINTS);

      // 🔥 Raw SQL insert into quiz_attempts table (matches dashboard query)
      const now = new Date();
      const result = await this.dataSource.query(
        `INSERT INTO quiz_attempts ("quizId", "userId", "startedAt", "completedAt", "earnPoint", "isCompleted")
         VALUES ($1, $2, $3, $3, $4, true)
         RETURNING id, "quizId", "userId", "earnPoint", "startedAt", "completedAt", "isCompleted"`,
        [quizId, userId, now, earnPoint],
      );

      return {
        ...(result?.[0] ?? {}),
        correctCount,
        totalQuestions,
        maxPoint: MAX_POINTS,
        earnPoint,
      };
    } catch (error) {
      handleDBError(error);
    }
  }

  async recordAnswer(quizId: number, questionId: number, dto: RecordAnswerDto, userId: string) {
    try {
      const attempt = await this.attemptRepo.findOne({
        where: { userId, quizId },
        relations: ['quiz', 'quiz.questions'],
        order: { startedAt: 'DESC' },
      });

      if (!attempt) {
        throw new NotFoundException('No active attempt found for this quiz');
      }

      const selectedOption = await this.optionRepo.findOne({
        where: { id: dto.optionId, questionId },
      });

      if (!selectedOption) {
        throw new NotFoundException('Selected option not found for this question');
      }

      let answer = await this.answerRepo.findOne({
        where: { attemptId: attempt.id, questionId },
      });

      if (answer) {
        answer.selectedOptionId = dto.optionId;
        answer.isCorrect = selectedOption.isCorrect;
        await this.answerRepo.save(answer);
      } else {
        answer = this.answerRepo.create({
          attemptId: attempt.id,
          questionId,
          selectedOptionId: dto.optionId,
          isCorrect: selectedOption.isCorrect,
        });
        await this.answerRepo.save(answer);
      }

      const totalQuestions = attempt.quiz.questions.length;

      const answeredCount = await this.answerRepo.count({
        where: { attemptId: attempt.id },
      });

      if (answeredCount >= totalQuestions) {
        attempt.completedAt = new Date();

        // 🔥 FIXED: 10 points total, proportional
        const correctAnswers = await this.answerRepo.count({
          where: {
            attemptId: attempt.id,
            isCorrect: true,
          },
        });

        const MAX_POINTS = 10;
        attempt.earnPoint = Math.floor((correctAnswers / totalQuestions) * MAX_POINTS);

        await this.attemptRepo.save(attempt);
      }

      return answer;
    } catch (error) {
      handleDBError(error);
    }
  }

  async createFullQuiz(dto: CreateFullQuizDto) {
    return await this.dataSource.transaction(async (manager) => {
      const quiz = manager.create(Quiz, {
        title: dto.title,
        description: dto.description,
        timeLimit: dto.timeLimit ?? 0,
        createdBy: dto.createdBy,
      });
      await manager.save(quiz);

      for (const q of dto.questions) {
        const question = manager.create(QuizQuestion, {
          quizId: quiz.id,
          question: q.question,
          points: q.points,
        });
        await manager.save(question);

        for (const o of q.options) {
          const option = manager.create(QuizQuestionOption, {
            questionId: question.id,
            option: o.option,
            isCorrect: o.isCorrect,
          });
          await manager.save(option);
        }
      }

      return manager.findOne(Quiz, {
        where: { id: quiz.id },
        relations: ['questions', 'questions.options'],
      });
    });
  }

  async updateFullQuiz(id: number, dto: UpdateFullQuizDto) {
    return await this.dataSource.transaction(async (manager) => {
      const quiz = await manager.findOne(Quiz, {
        where: { id },
        relations: ['questions', 'questions.options'],
      });

      if (!quiz) throw new NotFoundException(`Quiz with ID ${id} not found`);

      quiz.title = dto.title ?? quiz.title;
      quiz.description = dto.description ?? quiz.description;
      quiz.timeLimit = dto.timeLimit ?? quiz.timeLimit;
      if (dto.updatedBy) quiz.updatedBy = dto.updatedBy;
      await manager.save(quiz);

      const existingQuestionIds = quiz.questions.map((q) => q.id);
      const newQuestionIds = dto.questions?.map((q) => q.id).filter(Boolean) ?? [];

      const toDeleteQuestionIds = existingQuestionIds.filter(
        (qid) => !newQuestionIds.includes(qid),
      );
      if (toDeleteQuestionIds.length > 0) {
        await manager.delete(QuizQuestion, { id: In(toDeleteQuestionIds) });
      }

      for (const q of dto.questions ?? []) {
        let question: QuizQuestion;

        if (q.id) {
          const existingQuestion = await manager.findOne(QuizQuestion, {
            where: { id: q.id },
            relations: ['options'],
          });

          if (!existingQuestion) {
            throw new NotFoundException(`Question with ID ${q.id} not found`);
          }

          existingQuestion.question = q.question ?? existingQuestion.question;
          existingQuestion.points = q.points ?? existingQuestion.points;
          question = await manager.save(existingQuestion);
        } else {
          question = manager.create(QuizQuestion, {
            quizId: quiz.id,
            question: q.question,
            points: q.points ?? 0,
          });
          await manager.save(question);
        }

        const existingOptionIds = (question.options || []).map((o) => o.id);
        const newOptionIds = q.options?.map((o) => o.id).filter(Boolean) ?? [];
        const toDeleteOptionIds = existingOptionIds.filter((oid) => !newOptionIds.includes(oid));

        if (toDeleteOptionIds.length > 0) {
          await manager.delete(QuizQuestionOption, { id: In(toDeleteOptionIds) });
        }

        for (const o of q.options ?? []) {
          if (o.id) {
            await manager.update(QuizQuestionOption, o.id, {
              option: o.option,
              isCorrect: o.isCorrect,
            });
          } else {
            const option = manager.create(QuizQuestionOption, {
              questionId: question.id,
              option: o.option,
              isCorrect: o.isCorrect,
            });
            await manager.save(option);
          }
        }
      }

      return manager.findOne(Quiz, {
        where: { id: quiz.id },
        relations: ['questions', 'questions.options'],
      });
    });
  }
}