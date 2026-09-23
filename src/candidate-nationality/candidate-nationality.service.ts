import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateNationality } from './entities/candidate-nationality.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { Nationality } from '../common/entities/nationality.entity';
import { CreateCandidateNationalityDto } from './dto/create-candidate-nationality.dto';
import { UpdateCandidateNationalityDto } from './dto/update-candidate-nationality.dto';

@Injectable()
export class CandidateNationalityService {
  constructor(
    @InjectRepository(CandidateNationality)
    private readonly candidateNationalityRepo: Repository<CandidateNationality>,

    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,

    @InjectRepository(Nationality)
    private readonly nationalityRepo: Repository<Nationality>,
  ) {}

  // ✅ Create (add) nationality for candidate
  async create(dto: CreateCandidateNationalityDto) {
    const candidate = await this.candidateRepo.findOne({ where: { id: dto.candidateId } });
    if (!candidate) throw new NotFoundException(`Candidate #${dto.candidateId} not found`);

    const nationality = await this.nationalityRepo.findOne({ where: { id: dto.nationalityId } });
    if (!nationality) throw new NotFoundException(`Nationality #${dto.nationalityId} not found`);

    const existing = await this.candidateNationalityRepo.findOne({
      where: { candidateId: dto.candidateId, nationalityId: dto.nationalityId },
    });
    if (existing) return existing;

    const record = this.candidateNationalityRepo.create(dto);
    return this.candidateNationalityRepo.save(record);
  }

  // ✅ Get all nationalities of a candidate
  async findByCandidate(candidateId: number) {
    return this.candidateNationalityRepo.find({
      where: { candidateId },
      relations: ['nationality'],
      order: { id: 'ASC' },
    });
  }

  // ✅ Get one record (for editing)
  async findOne(id: number, candidateId: number) {
    const record = await this.candidateNationalityRepo.findOne({
      where: { id, candidateId },
      relations: ['nationality'],
    });
    if (!record)
      throw new NotFoundException(
        `CandidateNationality #${id} not found for candidate #${candidateId}`,
      );
    return record;
  }

  // ✅ Update nationality record
  async update(id: number, dto: UpdateCandidateNationalityDto) {
    const record = await this.candidateNationalityRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`CandidateNationality #${id} not found`);

    const nationality = await this.nationalityRepo.findOne({ where: { id: dto.nationalityId } });
    if (!nationality) throw new NotFoundException(`Nationality #${dto.nationalityId} not found`);

    record.nationalityId = dto.nationalityId;
    return this.candidateNationalityRepo.save(record);
  }

  // ✅ Remove nationality for candidate
  async remove(id: number, candidateId: number | null) {
    const result = await this.candidateNationalityRepo.delete({
      id,
      ...(candidateId ? { candidateId } : {}),
    });

    if (result.affected === 0) {
      throw new NotFoundException(`CandidateNationality #${id} not found`);
    }

    return { message: `CandidateNationality #${id} deleted successfully` };
  }
}
