import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateSkill } from './entities/candidate-skills.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { Skill } from '../common/entities/skill.entity';
import { CreateCandidateSkillDto } from './dto/create-candidate-skills.dto';
import { UpdateCandidateSkillDto } from './dto/update-candidate-skills.dto';

@Injectable()
export class CandidateSkillService {
  constructor(
    @InjectRepository(CandidateSkill)
    private readonly candidateSkillRepo: Repository<CandidateSkill>,

    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,

    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
  ) {}

  async create(dto: CreateCandidateSkillDto) {
    const candidate = await this.candidateRepo.findOne({
      where: { id: dto.candidateId },
    });
    if (!candidate)
      throw new NotFoundException(`Candidate #${dto.candidateId} not found`);

    const skill = await this.skillRepo.findOne({
      where: { id: dto.skillId },
    });
    if (!skill)
      throw new NotFoundException(`Skill #${dto.skillId} not found`);

    const existing = await this.candidateSkillRepo.findOne({
      where: { candidateId: dto.candidateId, skillId: dto.skillId },
    });
    if (existing) return existing;

    const record = this.candidateSkillRepo.create(dto);
    return this.candidateSkillRepo.save(record);
  }

  async findByCandidate(candidateId: number) {
    return this.candidateSkillRepo.find({
      where: { candidateId },
      relations: ['candidateSkills.skill'],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number, candidateId: number) {
    const record = await this.candidateSkillRepo.findOne({
      where: { id, candidateId },
      relations: ['candidateSkills.skill'],
    });

    if (!record)
      throw new NotFoundException(
        `CandidateSkill #${id} not found for candidate #${candidateId}`,
      );

    return record;
  }

  async update(id: number, dto: UpdateCandidateSkillDto) {
    const record = await this.candidateSkillRepo.findOne({
      where: { id },
    });
    if (!record)
      throw new NotFoundException(`CandidateSkill #${id} not found`);

    if (dto.skillId) {
      const skill = await this.skillRepo.findOne({
        where: { id: dto.skillId },
      });
      if (!skill)
        throw new NotFoundException(`Skill #${dto.skillId} not found`);
      record.skillId = dto.skillId;
    }

    if (dto.proficiencyLevel !== undefined)
      record.proficiencyLevel = dto.proficiencyLevel;

    if (dto.yearsOfExperience !== undefined)
      record.yearsOfExperience = dto.yearsOfExperience;

    return this.candidateSkillRepo.save(record);
  }

  async remove(id: number, candidateId: number | null) {
    const result = await this.candidateSkillRepo.delete({
      id,
      ...(candidateId ? { candidateId } : {}),
    });

    if (result.affected === 0)
      throw new NotFoundException(`CandidateSkill #${id} not found`);

    return { message: `CandidateSkill #${id} deleted successfully` };
  }
}
