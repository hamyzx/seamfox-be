import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Education } from './entities/education.entity';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

@Injectable()
export class EducationService {
  constructor(
    @InjectRepository(Education)
    private educationRepository: Repository<Education>,
  ) {}

  async create(dto: CreateEducationDto): Promise<Education> {
    const edu = this.educationRepository.create(dto);
    return this.educationRepository.save(edu);
  }

  async findByCandidate(candidateId: number): Promise<Education[]> {
    return this.educationRepository.find({ where: { candidateId } });
  }

  async update(id: number, dto: UpdateEducationDto): Promise<Education> {
    const result = await this.educationRepository.update({ id, candidateId: dto.candidateId }, dto);

    if (result.affected === 0) {
      throw new NotFoundException(`Education #${id} for candidate #${dto.candidateId} not found`);
    }
    const updated = await this.educationRepository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException(`Education #${id} not found`);
    return updated;
  }

  async remove(id: number, candidateId: number | null) {
    const result = await this.educationRepository.delete({
      id,
      ...(candidateId ? { candidateId } : {}),
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Education #${id} not found`);
    }
    return result;
  }
}
