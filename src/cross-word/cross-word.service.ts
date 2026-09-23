import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Crossword } from './entities/crossword.entity';
import { CrossWordClue } from './entities/crossword-clue.entity';
import { CrosswordAttempt } from './entities/crossword-attempt.entity';
import { CreateCrosswordDto } from './dto/create-crossword.dto';
import { UpdateCrosswordDto } from './dto/update-crossword.dto';
import { CreateClueDto } from './dto/create-clue.dto';
import { UpdateClueDto } from './dto/update-clue.dto';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { RecordAnswerDto } from './dto/record-answer.dto';
import { GetAllCrosswordDto } from './dto/get-all-crossword.dto';
import { handleDBError } from '../lib/error/dataBaseError';
import { CreateFullCrosswordDto } from './dto/create-full-crossword.dto';
import { UpdateFullCrosswordDto } from './dto/update-full-crossword.dto';
import { DataSource, In } from 'typeorm';

@Injectable()
export class CrosswordService {
  constructor(
    @InjectRepository(Crossword)
    private crosswordRepo: Repository<Crossword>,
    @InjectRepository(CrossWordClue)
    private clueRepo: Repository<CrossWordClue>,
    @InjectRepository(CrosswordAttempt)
    private attemptRepo: Repository<CrosswordAttempt>,

    private readonly dataSource: DataSource,
  ) {}

  async createCrossword(dto: CreateCrosswordDto) {
    try {
      const crossword = this.crosswordRepo.create(dto);
      return await this.crosswordRepo.save(crossword);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAllCrosswords(query: GetAllCrosswordDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', filters, search } = query;

      const qb = this.crosswordRepo
        .createQueryBuilder('crossword')
        .leftJoinAndSelect('crossword.clues', 'clues')
        .leftJoin('crossword.attempts', 'attempt')
        .loadRelationCountAndMap('crossword.totalAttemptCount', 'crossword.attempts');

      if (search) {
        qb.andWhere(
          '(LOWER(crossword.title) LIKE :search OR LOWER(crossword.description) LIKE :search)',
          { search: `%${search.toLowerCase()}%` },
        );
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`crossword.${field} = :${field}`, {
            [field]: filters[field],
          });
        });
      }

      qb.orderBy(`crossword.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

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

  async findOne(id: number) {
    const crossword = await this.crosswordRepo.findOne({
      where: { id },
      relations: ['clues'],
    });
    if (!crossword) throw new NotFoundException('Crossword not found');
    return crossword;
  }

  async updateCrossword(id: number, dto: UpdateCrosswordDto) {
    await this.crosswordRepo.update(id, dto);
    return this.findOne(id);
  }

  async removeCrossword(id: number, deletedBy: string) {
    await this.crosswordRepo.update(id, { deletedBy });
    return this.crosswordRepo.softDelete(id);
  }

  async addClue(crosswordId: number, dto: CreateClueDto) {
    try {
      const clue = this.clueRepo.create({ ...dto, crosswordId });
      return this.clueRepo.save(clue);
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateClue(clueId: number, dto: UpdateClueDto) {
    try {
      await this.clueRepo.update(clueId, dto);
      return this.clueRepo.findOne({ where: { id: clueId } });
    } catch (error) {
      handleDBError(error);
    }
  }

  async removeClue(clueId: number, deletedBy: string) {
    try {
      const clue = await this.clueRepo.findOne({ where: { id: clueId } });
      if (!clue) throw new NotFoundException('Clue not found');
      return this.clueRepo.remove(clue);
    } catch (error) {
      handleDBError(error);
    }
  }

  async createAttempt(crosswordId: number, userId: string) {
    try {
      const crossword = await this.findOne(crosswordId);

      if (!crossword) {
        throw new NotFoundException('Crossword not found');
      }

      const startedAt = new Date();

      const expiredAt = crossword.timeLimit
        ? new Date(startedAt.getTime() + crossword.timeLimit * 1000)
        : undefined;

      const attempt = this.attemptRepo.create({
        crosswordId,
        userId,
        startedAt,
        expiredAt,
      } as Partial<CrosswordAttempt>);

      return await this.attemptRepo.save(attempt);
    } catch (error) {
      handleDBError(error);
    }
  }

  // 🔥 NEW: Simple score submission
  async submitScore(
    crosswordId: number,
    userId: string,
    body: { isCompleted: boolean },
  ) {
    try {
      const isCompleted = body?.isCompleted === true;

      const crossword = await this.crosswordRepo.findOne({ where: { id: crosswordId } });
      if (!crossword) throw new NotFoundException('Crossword not found');

      // 🔥 FIXED: 10 points if completed, else 0
      const MAX_POINTS = 10;
      const earnPoint = isCompleted ? MAX_POINTS : 0;

      // 🔥 Use raw SQL to insert into "crosswordAttempt" (matches dashboard query)
      const now = new Date();
      await this.dataSource.query(
        `INSERT INTO "crosswordAttempt" ("crosswordId", "userId", "startedAt", "completedAt", "isCorrect", "isCompleted", "earnPoint", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $3, $4, $4, $5, $3, $3)`,
        [crosswordId, userId, now, isCompleted, earnPoint],
      );

      return {
        crosswordId,
        userId,
        earnPoint,
        isCompleted,
        maxPoint: MAX_POINTS,
      };
    } catch (error) {
      handleDBError(error);
    }
  }

  async recordAnswer(crosswordId: number, dto: RecordAnswerDto, userId: string) {
    try {
      const attempt = await this.attemptRepo.findOne({
        where: { crosswordId, userId },
        relations: ['crossword'],
        order: { startedAt: 'DESC' },
      });

      if (!attempt) {
        throw new NotFoundException('No active attempt found');
      }

      attempt.isCorrect = dto.isCorrect;
      attempt.completedAt = new Date();
      attempt.isCompleted = true;

      // 🔥 FIXED: 10 points if correct, else 0
      attempt.earnPoint = dto.isCorrect ? 10 : 0;

      return await this.attemptRepo.save(attempt);
    } catch (error) {
      handleDBError(error);
    }
  }

  async getUserAttempts(crosswordId: number, userId: string) {
    return this.attemptRepo.find({
      where: { crosswordId, userId },
      relations: ['crossword'],
    });
  }

  async createFullCrossword(dto: CreateFullCrosswordDto) {
    return await this.dataSource.transaction(async (manager) => {
      const crossword = manager.create(Crossword, {
        title: dto.title,
        description: dto.description,
        maxPoint: dto.maxPoint,
        timeLimit: dto.timeLimit,
        createdBy: dto.createdBy,
      });
      await manager.save(crossword);

      for (const c of dto.clues) {
        const clue = manager.create(CrossWordClue, {
          crosswordId: crossword.id,
          clue: c.clue,
          answer: c.answer,
          createdBy: dto.createdBy,
        });
        await manager.save(clue);
      }

      return manager.findOne(Crossword, {
        where: { id: crossword.id },
        relations: ['clues'],
      });
    });
  }

  async updateFullCrossword(id: number, dto: UpdateFullCrosswordDto) {
    return await this.dataSource.transaction(async (manager) => {
      const crossword = await manager.findOne(Crossword, {
        where: { id },
        relations: ['clues'],
      });

      if (!crossword) throw new NotFoundException(`Crossword with ID ${id} not found`);

      crossword.title = dto.title ?? crossword.title;
      crossword.description = dto.description ?? crossword.description;
      crossword.maxPoint = dto.maxPoint ?? crossword.maxPoint;
      crossword.timeLimit = dto.timeLimit ?? crossword.timeLimit;
      crossword.updatedBy = dto.updatedBy!;
      await manager.save(crossword);

      const existingClueIds = crossword.clues.map((c) => c.id);
      const newClueIds = (dto.clues ?? []).map((c: any) => c.id).filter(Boolean);

      const toDeleteIds = existingClueIds.filter((id) => !newClueIds.includes(id));
      if (toDeleteIds.length > 0) {
        await manager.delete(CrossWordClue, { id: In(toDeleteIds) });
      }

      for (const c of dto.clues ?? []) {
        if (c.id) {
          const existing = await manager.findOne(CrossWordClue, { where: { id: c.id } });
          if (!existing) continue;
          existing.clue = c.clue ?? existing.clue;
          existing.answer = c.answer ?? existing.answer;
          existing.updatedBy = dto.updatedBy!;
          await manager.save(existing);
        } else {
          const clue = manager.create(CrossWordClue, {
            crosswordId: crossword.id,
            clue: c.clue,
            answer: c.answer,
            createdBy: dto.updatedBy,
          });
          await manager.save(clue);
        }
      }

      return manager.findOne(Crossword, {
        where: { id: crossword.id },
        relations: ['clues'],
      });
    });
  }
}