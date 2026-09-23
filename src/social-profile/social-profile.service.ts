import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialProfile } from './entities/social-profile.entity';
import { CreateSocialProfileDto } from './dto/create-social-profile.dto';
import { UpdateSocialProfileDto } from './dto/update-social-profile.dto';

@Injectable()
export class SocialProfileService {
  constructor(
    @InjectRepository(SocialProfile)
    private certficationRepository: Repository<SocialProfile>,
  ) {}

  async create(dto: CreateSocialProfileDto): Promise<SocialProfile> {
    const edu = this.certficationRepository.create(dto);
    return this.certficationRepository.save(edu);
  }

  async findByCandidate(candidateId: number): Promise<SocialProfile[]> {
    return this.certficationRepository.find({ where: { candidateId } });
  }

  async update(id: number, dto: UpdateSocialProfileDto): Promise<SocialProfile> {
    const result = await this.certficationRepository.update(
      { id, candidateId: dto.candidateId },
      dto,
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `Social Profile #${id} for candidate #${dto.candidateId} not found`,
      );
    }
    const updated = await this.certficationRepository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException(`Social Profile #${id} not found`);
    return updated;
  }

  async remove(id: number, candidateId: number | null) {
    const result = await this.certficationRepository.delete({
      id,
      ...(candidateId ? { candidateId } : {}),
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Social Profile #${id} not found`);
    }
    return result;
  }
}
