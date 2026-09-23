import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CvGeneratorUpload, CvGeneratorStatus } from './entities/cv-generator-upload.entity';
import { MediaProvider } from '../media/media.provider';
import { MediaService } from '../media/media.service';
import { FolderNames } from '../lib/enums/media.enum';

interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CvGeneratorStatus;
}

@Injectable()
export class CvGeneratorProvider {
  private readonly logger = new Logger(CvGeneratorProvider.name);

  constructor(
    @InjectRepository(CvGeneratorUpload)
    private readonly repo: Repository<CvGeneratorUpload>,
    private readonly mediaProvider: MediaProvider,
    private readonly mediaService: MediaService,
  ) {}

async uploadAndGenerate(file: Express.Multer.File, uploadedById: string) {
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(fileExt ?? '')) {
      throw new BadRequestException('Only PDF and DOCX files are supported');
    }

    let parsedMeta: any = null;
    try {
      const parseRes = await this.mediaProvider.parseCvForOnboarding(file);
      parsedMeta = parseRes?.parsedData;
    } catch (err: any) {
      this.logger.warn(`[uploadAndGenerate] Quick parse failed: ${err?.message}`);
    }

    const candidateName = parsedMeta
      ? [parsedMeta.firstName, parsedMeta.lastName].filter(Boolean).join(' ') || null
      : null;

    const record = this.repo.create({
      originalFileName: file.originalname,
      originalKey: '',
      originalSize: file.size,
      candidateName,
      candidateEmail: parsedMeta?.email || null,
      candidatePhone: parsedMeta?.phone || null,
      status: CvGeneratorStatus.PROCESSING,
      uploadedById,
    });
    const saved = await this.repo.save(record);

    try {
      const originalPdf = await this.mediaProvider.convertToPdf(
        { originalname: file.originalname, buffer: file.buffer },
        FolderNames.DEFAULT,
      );

      const originalKey = originalPdf.key
        ? originalPdf.key
        : await this.mediaService.uploadFile(
            file.originalname,
            file.buffer,
            FolderNames.DEFAULT,
            file.size,
          );

      const result = await this.mediaProvider.processCvAsPdf(
        { originalname: file.originalname, buffer: file.buffer },
        originalKey,
        FolderNames.DEFAULT,
        null,
        candidateName,
      );

      saved.originalKey = originalKey;
      saved.processedKey = result.processedKey || null;
      saved.status = result.processedKey
        ? CvGeneratorStatus.COMPLETED
        : CvGeneratorStatus.FAILED;
      saved.errorMessage = result.processedKey
        ? null
        : 'CV processing did not return a generated file';
      const finalSaved = await this.repo.save(saved);

      this.logger.log(
        `[uploadAndGenerate] Done record ${finalSaved.id}, status: ${finalSaved.status}`,
      );
      return this.toResponseDto(finalSaved);
    } catch (err: any) {
      this.logger.error(`[uploadAndGenerate] Failed: ${err?.message}`, err?.stack);
      saved.status = CvGeneratorStatus.FAILED;
      saved.errorMessage = err?.message || 'Unknown error during CV generation';
      await this.repo.save(saved);
      throw new BadRequestException(saved.errorMessage);
    }
  }

  async findAll(query: ListQuery) {
    const { page = 1, limit = 10, search, status } = query;
    const qb = this.repo
      .createQueryBuilder('cv')
      .leftJoinAndSelect('cv.uploadedBy', 'uploader')
      .orderBy('cv.createdAt', 'DESC');

    if (search?.trim()) {
      qb.andWhere(
        '(LOWER(cv.candidateName) LIKE :search OR LOWER(cv.originalFileName) LIKE :search OR LOWER(cv.candidateEmail) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (status) {
      qb.andWhere('cv.status = :status', { status });
    }

    qb.skip((+page - 1) * +limit).take(+limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map((d) => this.toResponseDto(d)),
      total,
      page: +page,
      limit: +limit,
    };
  }

  async findOne(id: number) {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });
    if (!record) throw new NotFoundException('Upload not found');
    return this.toResponseDto(record);
  }

  async delete(id: number) {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Upload not found');

    if (record.originalKey) {
      try {
        await this.mediaProvider.deleteFile(record.originalKey);
      } catch (err: any) {
        this.logger.warn(`[delete] S3 original delete failed: ${err?.message}`);
      }
    }
    if (record.processedKey) {
      try {
        await this.mediaProvider.deleteFile(record.processedKey);
      } catch (err: any) {
        this.logger.warn(`[delete] S3 processed delete failed: ${err?.message}`);
      }
    }

    await this.repo.delete(id);
    this.logger.log(`[delete] Hard deleted record ${id} + S3 files`);
    return { id, message: 'Deleted successfully' };
  }

  private toResponseDto(record: CvGeneratorUpload) {
    return {
      id: record.id,
      originalFileName: record.originalFileName,
      originalKey: record.originalKey,
      originalUrl: record.originalKey ? this.mediaProvider.getMediaUrl(record.originalKey) : null,
      originalSize: record.originalSize,
      processedKey: record.processedKey,
      processedUrl: record.processedKey ? this.mediaProvider.getMediaUrl(record.processedKey) : null,
      candidateName: record.candidateName,
      candidateEmail: record.candidateEmail,
      candidatePhone: record.candidatePhone,
      status: record.status,
      errorMessage: record.errorMessage,
      uploadedBy: record.uploadedBy
        ? {
            id: record.uploadedBy.id,
            email: record.uploadedBy.email,
            firstName: (record.uploadedBy as any).firstName,
            lastName: (record.uploadedBy as any).lastName,
          }
        : null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}