import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { handleDBError } from '../lib/error/dataBaseError';
import { GetAllFaqDto } from './dto/get-all-faq.dto';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private faqRepository: Repository<Faq>,
  ) {}

  async create(dto: CreateFaqDto): Promise<Faq> {
    try {
      const faq = this.faqRepository.create(dto);
      return await this.faqRepository.save(faq);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAll(query: GetAllFaqDto) {
    try {
      const {
        page = 1,
        limit = 100,
        sortBy = 'id',
        order = 'ASC',
        filters,
        search,
        type,
      } = query;

      const qb = this.faqRepository.createQueryBuilder('faq');

      qb.where('faq.isActive = :isActive', { isActive: true });

      if (type) {
        qb.andWhere('faq.type = :type', { type: type.toUpperCase() });
      }

      if (search) {
        qb.andWhere('(LOWER(faq.question) LIKE :search OR LOWER(faq.answer) LIKE :search)', {
          search: `%${search.toLowerCase()}%`,
        });
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`faq.${field} = :${field}`, { [field]: filters[field] });
        });
      }

      qb.orderBy(`faq.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

      if (limit && page) {
        qb.skip((+page - 1) * +limit).take(+limit);
      }

      const [data, total] = await qb.getManyAndCount();

      return data;
    } catch (error) {
      handleDBError(error);
    }
  }

  async findOne(id: number): Promise<Faq> {
    try {
      const faq = await this.faqRepository.findOne({ where: { id, isActive: true } });

      if (!faq) {
        throw new NotFoundException(`FAQ #${id} not found`);
      }

      return faq;
    } catch (error) {
      handleDBError(error);
    }
  }

  async update(id: number, dto: UpdateFaqDto): Promise<Faq> {
    try {
      const faq = await this.faqRepository.findOne({ where: { id } });
      if (!faq) throw new NotFoundException(`FAQ #${id} not found`);

      Object.assign(faq, dto);
      return this.faqRepository.save(faq);
    } catch (error) {
      handleDBError(error);
    }
  }

  async remove(id: number, deletedBy: string) {
    try {
      const faq = await this.faqRepository.findOne({ where: { id } });
      if (!faq) throw new NotFoundException(`FAQ #${id} not found`);

      faq.deletedBy = deletedBy;
      faq.deletedAt = new Date();

      return await this.faqRepository.save(faq);
    } catch (error) {
      handleDBError(error);
    }
  }
}