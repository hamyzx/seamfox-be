import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobLanguage } from './entities/job-language.entity';
import { CreateJobLanguageDto } from './dto/create-job-language.dto';
import { UpdateJobLanguageDto } from './dto/update-job-language.dto';
import { Job } from '../job/entities/job.entity';
import { Language } from '../common/entities/language.entity';

@Injectable()
export class JobLanguageService {
  constructor(
    @InjectRepository(JobLanguage)
    private readonly jobLanguageRepo: Repository<JobLanguage>,
  ) {}

  async create(dto: CreateJobLanguageDto) {
    const record = this.jobLanguageRepo.create({
      job: { id: dto.jobId },
      language: { id: dto.languageId },
    });
    return await this.jobLanguageRepo.save(record);
  }

  async findAll() {
    return this.jobLanguageRepo.find({
      relations: ['job', 'language'],
    });
  }

  async findByJob(jobId: number) {
    return this.jobLanguageRepo.find({
      where: { job: { id: jobId } },
      relations: ['language'],
    });
  }

  async update(id: number, dto: UpdateJobLanguageDto) {
    const record = await this.jobLanguageRepo.findOne({ where: { id } });

    if (!record) {
      throw new Error(`JobLanguage with ID ${id} not found`);
    }

    record.job = { id: dto.jobId } as Job;
    record.language = { id: dto.languageId } as Language;

    return await this.jobLanguageRepo.save(record);
  }

  async remove(id: number) {
    return await this.jobLanguageRepo.delete(id);
  }
}
