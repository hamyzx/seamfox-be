import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mystery } from './entities/mystery.entity';
import { MysteryOption } from './entities/mystery-option.entity';
import { MysteryAttempt } from './entities/mystery-attempt.entity';
import { CreateMysteryDto } from './dto/create-mystery.dto';
import { UpdateMysteryDto } from './dto/update-mystery.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreateFullMysteryDto } from './dto/create-full-mystery.dto';
import { UpdateFullMysteryDto } from './dto/update-full-mystery.dto';
import { RecordAnswerDto } from './dto/record-answer.dto';
import { GetAllMysteryDto } from './dto/get-all-mystery.dto';
import { handleDBError } from '../lib/error/dataBaseError';
import { getWeek } from 'date-fns';
import { DataSource, In } from 'typeorm';

@Injectable()
export class MysteryService {
  constructor(
    @InjectRepository(Mystery)
    private readonly mysteryRepo: Repository<Mystery>,
    @InjectRepository(MysteryOption)
    private readonly optionRepo: Repository<MysteryOption>,
    @InjectRepository(MysteryAttempt)
    private readonly attemptRepo: Repository<MysteryAttempt>,

    private readonly dataSource: DataSource,
  ) {}

  async createMystery(dto: CreateMysteryDto) {
    try {
      const mystery = this.mysteryRepo.create(dto);
      return await this.mysteryRepo.save(mystery);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAllMysteries(query: GetAllMysteryDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', filters, search } = query;

      const qb = this.mysteryRepo
        .createQueryBuilder('mystery')
        .leftJoinAndSelect('mystery.options', 'options')
        .leftJoin('mystery.attempts', 'attempt')
        .loadRelationCountAndMap('mystery.totalAttemptCount', 'mystery.attempts');

      if (search) {
        qb.andWhere('LOWER(mystery.word) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        });
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`mystery.${field} = :${field}`, {
            [field]: filters[field],
          });
        });
      }

      qb.orderBy(`mystery.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

      if (limit && page) {
        qb.skip((+page - 1) * +limit).take(+limit);
      }

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }

  async findOneMystery(id: number) {
    const mystery = await this.mysteryRepo.findOne({
      where: { id },
      relations: ['options'],
    });
    if (!mystery) throw new NotFoundException('Mystery not found');
    return mystery;
  }

  async updateMystery(id: number, dto: UpdateMysteryDto) {
    await this.mysteryRepo.update(id, dto);
    return this.findOneMystery(id);
  }

  async deleteMystery(id: number, deletedBy: string) {
    await this.mysteryRepo.update(id, { deletedBy });
    return this.mysteryRepo.softDelete(id);
  }

  async addOption(mysteryId: number, dto: CreateOptionDto) {
    try {
      const option = this.optionRepo.create({ ...dto, mysteryId });
      return await this.optionRepo.save(option);
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateOption(optionId: number, dto: UpdateOptionDto) {
    try {
      await this.optionRepo.update(optionId, dto);
      return this.optionRepo.findOne({ where: { id: optionId } });
    } catch (error) {
      handleDBError(error);
    }
  }

  async deleteOption(id: number, deletedBy: string) {
    try {
      await this.optionRepo.update(id, { deletedBy });
      return this.optionRepo.softDelete(id);
    } catch (error) {
      handleDBError(error);
    }
  }

  async getActiveMysteries() {
    try {
      const now = new Date();
      if (now.getDay() !== 1) {
        throw new BadRequestException('Active mystery is only available on Mondays');
      }

      const currentWeekNo = getWeek(now, { weekStartsOn: 1 });
      return this.mysteryRepo.find({
        where: { weekNo: currentWeekNo },
        relations: ['options'],
      });
    } catch (error) {
      handleDBError(error);
    }
  }

  async createAttempt(mysteryId: number, userId: string) {
    try {
      const mystery = await this.findOneMystery(mysteryId);

      if (!mystery) {
        throw new NotFoundException('Mystery not found');
      }

      const startedAt = new Date();

      const expiredAt = mystery.timeLimit
        ? new Date(startedAt.getTime() + mystery.timeLimit * 1000)
        : null;

      const attempt = this.attemptRepo.create({
        mysteryId,
        userId,
        startedAt,
        expiredAt,
      } as Partial<MysteryAttempt>);

      return await this.attemptRepo.save(attempt);
    } catch (error) {
      handleDBError(error);
    }
  }

  // 🔥 NEW: Simple score submission
  async submitScore(
    mysteryId: number,
    userId: string,
    body: { isCorrect: boolean },
  ) {
    try {
      const isCorrect = body?.isCorrect === true;

      const mystery = await this.mysteryRepo.findOne({ where: { id: mysteryId } });
      if (!mystery) throw new NotFoundException('Mystery not found');

      // 🔥 FIXED: 10 points if correct, else 0
      const MAX_POINTS = 10;
      const earnPoint = isCorrect ? MAX_POINTS : 0;

      // 🔥 Use raw SQL to insert into mystery_attempts (matches entity & dashboard query)
      const now = new Date();
      const result = await this.dataSource.query(
        `INSERT INTO mystery_attempts ("mysteryId", "userId", "startedAt", "completedAt", "isCorrect", "earnPoint")
         VALUES ($1, $2, $3, $3, $4, $5)
         RETURNING id, "mysteryId", "userId", "earnPoint", "startedAt", "completedAt", "isCorrect"`,
        [mysteryId, userId, now, isCorrect, earnPoint],
      );

      return {
        ...(result?.[0] ?? {}),
        maxPoint: MAX_POINTS,
        earnPoint,
      };
    } catch (error) {
      handleDBError(error);
    }
  }

  async recordAnswer(mysteryId: number, dto: RecordAnswerDto, userId: string) {
    try {
      const attempt = await this.attemptRepo.findOne({
        where: { mysteryId, userId },
        relations: ['mystery'],
        order: { startedAt: 'DESC' },
      });

      if (!attempt) {
        throw new NotFoundException('No active attempt found');
      }

      const selectedOption = await this.optionRepo.findOne({
        where: { id: dto.optionId, mysteryId },
      });

      if (!selectedOption) {
        throw new NotFoundException('Selected option not found for this mystery');
      }

      attempt.selectedOptionId = selectedOption.id;
      attempt.isCorrect = selectedOption.isCorrect;
      attempt.completedAt = new Date();

      // 🔥 FIXED: 10 points if correct, else 0
      attempt.earnPoint = attempt.isCorrect ? 10 : 0;

      return await this.attemptRepo.save(attempt);
    } catch (error) {
      handleDBError(error);
    }
  }

  async getUserAttempts(mysteryId: number, userId: string) {
    return this.attemptRepo.find({
      where: { mysteryId, userId },
      relations: ['mystery', 'selectedOption'],
    });
  }

  async createFullMystery(dto: CreateFullMysteryDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const mystery = manager.create(Mystery, {
          weekNo: dto.weekNo,
          word: dto.word,
          description: dto.description,
          timeLimit: dto.timeLimit ?? 60,
          maxPoint: dto.maxPoint ?? 100,
          createdBy: dto.createdBy,
        });

        await manager.save(mystery);

        if (dto.options && dto.options.length > 0) {
          const options = dto.options.map((opt) =>
            manager.create(MysteryOption, {
              mysteryId: mystery.id,
              meaning: opt.meaning,
              isCorrect: opt.isCorrect ?? false,
              createdBy: dto.createdBy,
            }),
          );
          await manager.save(MysteryOption, options);
        }

        return await manager.findOne(Mystery, {
          where: { id: mystery.id },
          relations: ['options'],
        });
      });
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateFullMystery(id: number, dto: UpdateFullMysteryDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const mystery = await manager.findOne(Mystery, {
          where: { id },
          relations: ['options'],
        });

        if (!mystery) throw new NotFoundException(`Mystery with ID ${id} not found`);

        mystery.weekNo = dto.weekNo ?? mystery.weekNo;
        mystery.word = dto.word ?? mystery.word;
        mystery.description = dto.description ?? mystery.description;
        mystery.timeLimit = dto.timeLimit ?? mystery.timeLimit;
        mystery.maxPoint = dto.maxPoint ?? mystery.maxPoint;
        mystery.updatedBy = dto.updatedBy!;

        await manager.save(mystery);

        const existingOptionIds = (mystery.options || []).map((o) => o.id);
        const newOptionIds = (dto.options || []).map((o: any) => o.id).filter(Boolean);

        const toDeleteOptionIds = existingOptionIds.filter((id) => !newOptionIds.includes(id));
        if (toDeleteOptionIds.length > 0) {
          await manager.delete(MysteryOption, { id: In(toDeleteOptionIds) });
        }

        for (const o of dto.options || []) {
          if (o.id) {
            const existingOption = await manager.findOne(MysteryOption, { where: { id: o.id } });
            if (existingOption) {
              existingOption.meaning = o.meaning ?? existingOption.meaning;
              existingOption.isCorrect = o.isCorrect ?? existingOption.isCorrect;
              existingOption.updatedBy = dto.updatedBy!;
              await manager.save(existingOption);
            }
          } else {
            const newOpt = manager.create(MysteryOption, {
              mysteryId: mystery.id,
              meaning: o.meaning,
              isCorrect: o.isCorrect ?? false,
              createdBy: dto.updatedBy,
            });
            await manager.save(newOpt);
          }
        }

        return manager.findOne(Mystery, {
          where: { id: mystery.id },
          relations: ['options'],
        });
      });
    } catch (error) {
      handleDBError(error);
    }
  }
}