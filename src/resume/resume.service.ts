import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from './entities/resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { MediaProvider } from '../media/media.provider';
import { FolderNames } from '../lib/enums/media.enum';
import { SubscriptionService } from '../subscription/subscription.service'; // ✅ NEW

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,

    @Inject(forwardRef(() => MediaProvider))
    private mediaProvider: MediaProvider,

    private readonly subscriptionService: SubscriptionService, // ✅ NEW
  ) {}
  
  // ✅ userId added — needed for subscription limit check
  async create(dto: CreateResumeDto, userId?: string): Promise<Resume> {
    console.log("testing logs")
    // ✅ CV Library limit check — featureId=7
    if (userId) {
      const featureLimit = await this.subscriptionService.getFeatureLimit(userId, 7);
      if (featureLimit?.limit && featureLimit.limit !== 'unlimited') {
        const existing = await this.resumeRepository.count({
          where: { candidateId: dto.candidateId },
        });
        if (existing >= Number(featureLimit.limit)) {
          throw new BadRequestException(
            `CV library limit reached (${featureLimit.limit}). Please upgrade your plan to upload more CVs.`,
          );
        }
      }
    }

    if (dto.filePath) {
      const profileImg = await this.mediaProvider.moveFile(FolderNames.RESUME, dto.filePath);
      dto.filePath = profileImg;
    }

    return this.resumeRepository.manager.transaction(async (em) => {
      // Unset existing default
      await em.update(
        Resume,
        { candidateId: dto.candidateId, isDefault: true },
        { isDefault: false },
      );

      // Insert new resume as default
      const resume = em.create(Resume, { ...dto, isDefault: true });
      return em.save(resume);
    });
  }

  async findByCandidate(candidateId: number): Promise<Resume[]> {
    return this.resumeRepository.find({ where: { candidateId } });
  }

  async getAnyResume(candidateId: number): Promise<Resume> {
    const resume = await this.resumeRepository.findOne({ where: { candidateId } });
    if (!resume) throw new NotFoundException('No resume found for this candidate.');
    return resume;
  }

  async updateResumeDefault(resumeId: number, candidateId: number) {
    return this.resumeRepository.manager.transaction(async (em) => {
      await em.update(Resume, { candidateId, isDefault: true }, { isDefault: false });
      const result = await em.update(Resume, { id: resumeId, candidateId }, { isDefault: true });
      return result;
    });
  }

  async remove(id: number, candidateId: number | null) {
    if (!candidateId) throw new BadRequestException('candidateId is required');

    const resumeCount = await this.resumeRepository.count({ where: { candidateId } });
    if (resumeCount <= 1) {
      throw new BadRequestException(
        'You cannot delete your only resume. Please reupload another resume instead of deleting this one.',
      );
    }

    const result = await this.resumeRepository.delete({ id, candidateId });
    if (result.affected === 0) throw new NotFoundException(`Resume #${id} not found`);

    return { message: 'Resume deleted successfully' };
  }

  async updateResumeFile(resumeId: number, filePath: string) {
    return this.resumeRepository.update({ id: resumeId }, { filePath });
  }

  async getResumeById(resumeId: number): Promise<Resume> {
    const resume = await this.resumeRepository.findOne({ where: { id: resumeId } });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async getCandidateIdFromResume(resumeId: number): Promise<number> {
    const resume = await this.resumeRepository.findOne({ where: { id: resumeId } });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume.candidateId;
  }

  async countCandidateResumes(candidateId: number): Promise<number> {
    return this.resumeRepository.count({ where: { candidateId } });
  }
}