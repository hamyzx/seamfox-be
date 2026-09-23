import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Experience } from './entities/experience.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { CreateExperienceDto, UpdateExperienceDto } from './dto/experience.dto';

@Injectable()
export class ExperienceProvider {
  private readonly logger = new Logger(ExperienceProvider.name);

  constructor(
    @InjectRepository(Experience)
    private readonly experienceRepo: Repository<Experience>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // Helper: resolve candidate by userId
  // ─────────────────────────────────────────────────────────────────────
  private async getCandidateByUserId(userId: string): Promise<Candidate> {
    const candidate = await this.candidateRepo.findOne({ where: { userId } });
    if (!candidate) {
      throw new NotFoundException('Candidate profile not found');
    }
    return candidate;
  }

  // ─────────────────────────────────────────────────────────────────────
  // CREATE single experience
  // ─────────────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateExperienceDto) {
    const candidate = await this.getCandidateByUserId(userId);

    // If marked as current role, unset endDate
    const payload = {
      ...dto,
      candidateId: candidate.id,
      endDate: dto.isCurrentRole ? null : dto.endDate || null,
    };

    const exp = this.experienceRepo.create(payload as any);
    const saved = await this.experienceRepo.save(exp);
    this.logger.log(`[create] Created experience for candidate ${candidate.id}`);
    return saved;
  }

  // ─────────────────────────────────────────────────────────────────────
  // BULK CREATE (used during onboarding when user adds multiple jobs at once)
  // ─────────────────────────────────────────────────────────────────────
  async bulkCreate(userId: string, dtos: CreateExperienceDto[]) {
    const candidate = await this.getCandidateByUserId(userId);

    const payloads = dtos.map((dto) => ({
      ...dto,
      candidateId: candidate.id,
      endDate: dto.isCurrentRole ? null : dto.endDate || null,
    }));

    const experiences = this.experienceRepo.create(payloads as any);
    const saved = await this.experienceRepo.save(experiences);
    this.logger.log(
      `[bulkCreate] Created ${saved.length} experiences for candidate ${candidate.id}`,
    );
    return saved;
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET all experiences for current user
  // ─────────────────────────────────────────────────────────────────────
  async findAllForUser(userId: string) {
    const candidate = await this.getCandidateByUserId(userId);
    return this.experienceRepo.find({
      where: { candidateId: candidate.id },
      order: { isCurrentRole: 'DESC', startDate: 'DESC' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET all experiences for a specific candidate (used by admin / public profile)
  // ─────────────────────────────────────────────────────────────────────
  async findAllByCandidateId(candidateId: number) {
    return this.experienceRepo.find({
      where: { candidateId },
      order: { isCurrentRole: 'DESC', startDate: 'DESC' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET single
  // ─────────────────────────────────────────────────────────────────────
  async findOne(userId: string, id: number) {
    const candidate = await this.getCandidateByUserId(userId);
    const exp = await this.experienceRepo.findOne({ where: { id } });
    if (!exp) throw new NotFoundException('Experience not found');
    if (exp.candidateId !== candidate.id) {
      throw new ForbiddenException('Not allowed');
    }
    return exp;
  }

  // ─────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────
  async update(userId: string, id: number, dto: UpdateExperienceDto) {
    const exp = await this.findOne(userId, id);

    Object.assign(exp, dto);

    // If marked current role, clear endDate
    if (dto.isCurrentRole === true) {
      exp.endDate = null;
    }

    const updated = await this.experienceRepo.save(exp);
    this.logger.log(`[update] Updated experience ${id}`);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────
  async delete(userId: string, id: number) {
    const exp = await this.findOne(userId, id);
    await this.experienceRepo.delete(exp.id);
    this.logger.log(`[delete] Deleted experience ${id}`);
    return { id, message: 'Experience deleted' };
  }
}