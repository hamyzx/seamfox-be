import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certification } from './entities/certification.entity';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { MediaProvider } from '../media/media.provider';
import { FolderNames } from '../lib/enums/media.enum';

@Injectable()
export class CertificationService {
  constructor(
    @InjectRepository(Certification)
    private certficationRepository: Repository<Certification>,
    private mediaProvider: MediaProvider,
  ) {}

  async create(dto: CreateCertificationDto): Promise<Certification> {
    if (dto.filePath) {
      const profileImg = await this.mediaProvider.moveFile(FolderNames.CERTIFICATES, dto.filePath);
      dto.filePath = profileImg;
    }
    const edu = this.certficationRepository.create(dto);
    return this.certficationRepository.save(edu);
  }

  async findByCandidate(candidateId: number): Promise<Certification[]> {
    return this.certficationRepository.find({ where: { candidateId } });
  }

  async update(id: number, dto: UpdateCertificationDto): Promise<Certification> {
    if (dto.filePath) {
      const file = await this.mediaProvider.moveFile(FolderNames.CERTIFICATES, dto.filePath);
      dto.filePath = file;
    }
    const result = await this.certficationRepository.update(
      { id, candidateId: dto.candidateId },
      dto,
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `Certification #${id} for candidate #${dto.candidateId} not found`,
      );
    }
    const updated = await this.certficationRepository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException(`Certification #${id} not found`);
    return updated;
  }

  async remove(id: number, candidateId: number | null) {
    const result = await this.certficationRepository.delete({
      id,
      ...(candidateId ? { candidateId } : {}),
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Certification #${id} not found`);
    }
    return result;
  }
}
