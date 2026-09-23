import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateSkill } from './entities/candidate-skill.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { handleDBError } from '../lib/error/dataBaseError';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(CandidateSkill)
    private candidateSkillRepository: Repository<CandidateSkill>,
  ) {}

  async create(dto: CreateSkillDto): Promise<CandidateSkill> {
    try {
      const skill = this.candidateSkillRepository.create(dto);
      return await this.candidateSkillRepository.save(skill);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findByCandidate(candidateId: number): Promise<CandidateSkill[]> {
    return this.candidateSkillRepository.find({
      where: { candidateId },
      relations: ['skill'],
    });
  }

  async update(id: number, dto: UpdateSkillDto): Promise<CandidateSkill> {
    const result = await this.candidateSkillRepository.update(
      { id, candidateId: dto.candidateId },
      dto,
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `Candidate Skill #${id} for candidate #${dto.candidateId} not found`,
      );
    }
    const updated = await this.candidateSkillRepository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException(`Candidate Skill #${id} not found`);
    return updated;
  }

  async remove(id: number, candidateId: number | null) {
    const result = await this.candidateSkillRepository.delete({
      id,
      ...(candidateId ? { candidateId } : {}),
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Candidate Skill #${id} not found`);
    }
    return result;
  }
}
