import { Injectable, NotFoundException } from '@nestjs/common';
import { CandidateLanguage } from './entities/candidate-language.entity';
import { CreateCandidateLanguageDto } from './dto/create-candidate-language.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { handleDBError } from '../lib/error/dataBaseError';

@Injectable()
export class CandidateLanguageService {
  constructor(
    @InjectRepository(CandidateLanguage)
    private readonly candidateLanguageRepo: Repository<CandidateLanguage>,
  ) {}

  async create(createDto: CreateCandidateLanguageDto) {
    const record = this.candidateLanguageRepo.create(createDto);
    return await this.candidateLanguageRepo.save(record);
  }

  // ─── Update by ID ───────────────────────
  async updateLanguage(id: number, dto: Partial<CreateCandidateLanguageDto>) {
    try {
      const existing = await this.candidateLanguageRepo.findOne({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`CandidateLanguage #${id} not found`);
      }

      // Update only provided fields
      if (dto.languageId !== undefined) existing.languageId = dto.languageId;
      if (dto.isRead !== undefined) existing.isRead = dto.isRead;
      if (dto.isWrite !== undefined) existing.isWrite = dto.isWrite;
      if (dto.isSpoken !== undefined) existing.isSpoken = dto.isSpoken;

      return await this.candidateLanguageRepo.save(existing);
    } catch (error) {
      handleDBError(error);
    }
  }

  // ─── Get by ID ─────────────────────────
  async findOne(id: number) {
    try {
      const record = await this.candidateLanguageRepo.findOne({
        where: { id },
        relations: ['language', 'candidate'],
      });
      if (!record) throw new NotFoundException(`CandidateLanguage #${id} not found`);
      return record;
    } catch (error) {
      handleDBError(error);
    }
  }

  // ─── Find All By Candidate ───────────────
  async findByCandidate(candidateId: number) {
    try {
      return await this.candidateLanguageRepo.find({
        where: { candidateId },
        relations: ['language'],
        order: { id: 'ASC' },
      });
    } catch (error) {
      handleDBError(error);
    }
  }

  // ─── Delete ──────────────────────────────
  async remove(id: number, candidateId: number | null = null) {
    try {
      const result = await this.candidateLanguageRepo.delete({
        id,
        ...(candidateId ? { candidateId } : {}),
      });

      if (result.affected === 0) {
        throw new NotFoundException(`CandidateLanguage #${id} not found`);
      }

      return { message: `CandidateLanguage #${id} deleted successfully` };
    } catch (error) {
      handleDBError(error);
    }
  }
}
