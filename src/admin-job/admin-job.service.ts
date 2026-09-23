import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Job } from '../job/entities/job.entity';
import { Application } from '../application/entities/application.entity';
import { Education } from '../common/entities/education.entity';
import { CreateJobDto } from '../job/dto/create-job.dto';
import { UpdateJobDto } from '../job/dto/update-job.dto';
import { GetAllJobDto } from '../job/dto/get-all-job.dto';
import { KanbanBoardService } from '../company/kanban-board/kanban-board.service';
import { handleDBError } from '../lib/error/dataBaseError';

@Injectable()
export class AdminJobService {
  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
    @InjectRepository(Application)
    private applicationRepo: Repository<Application>,
    @InjectRepository(Education)
    private educationRepo: Repository<Education>,
    private readonly kanbanBoardService: KanbanBoardService,
  ) {}

  private async resolveEducations(ids?: number[]): Promise<Education[]> {
    if (!ids || ids.length === 0) return [];
    return this.educationRepo.findBy({ id: In(ids) });
  }

  async createAdminJob(dto: CreateJobDto): Promise<Job> {
    try {
      if (!dto.companyName) {
        throw new BadRequestException('Company name is required for admin jobs');
      }

      // Create a virtual kanban board for admin job
      const kanbanBoard = await this.kanbanBoardService.createAdminJobBoard();
      if (!kanbanBoard) {
        throw new BadRequestException('Failed to create kanban board');
      }
      dto.kanbanBoardId = kanbanBoard.id;
      // Admin jobs don't have companyId - leave it undefined

      const { requiredEducationIds, ...jobData } = dto;
      const educations = await this.resolveEducations(requiredEducationIds);

      const job = this.jobRepo.create(jobData);
      job.educations = educations;

      return await this.jobRepo.save(job);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAllAdminJobs(query: GetAllJobDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC', filters, search } = query;

      const qb = this.jobRepo
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.jobTitle', 'jobTitle')
        .leftJoinAndSelect('job.jobLanguages', 'jobLanguages')
        .leftJoinAndSelect('jobLanguages.language', 'language')
        .leftJoinAndSelect('job.education', 'education')
        .leftJoinAndSelect('job.educations', 'educations')
        .loadRelationCountAndMap('job.applicationCount', 'job.applications')
        .where("job.createdByType = 'admin'");

      if (search) {
        qb.andWhere(
          `(
            LOWER(jobTitle.name) LIKE :search OR
            LOWER(job.companyName) LIKE :search OR
            LOWER(job.description) LIKE :search OR
            LOWER(job.city) LIKE :search OR
            LOWER(job.country) LIKE :search OR
            LOWER(job.department) LIKE :search
          )`,
          { search: `%${search.toLowerCase()}%` },
        );
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`job.${field} = :${field}`, { [field]: filters[field] });
        });
      }

      qb.orderBy(`job.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      qb.skip((+page - 1) * +limit).take(+limit);

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAdminJobById(id: number): Promise<Job> {
    try {
      const job = await this.jobRepo.findOne({
        where: { id, createdByType: 'admin' },
        relations: [
          'jobTitle',
          'education',
          'educations',
          'jobLanguages',
          'jobLanguages.language',
          'applications',
        ],
      });

      if (!job) {
        throw new NotFoundException(`Admin job #${id} not found`);
      }

      return job;
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateAdminJob(id: number, dto: UpdateJobDto): Promise<Job> {
    try {
      const job = await this.jobRepo.findOne({
        where: { id, createdByType: 'admin' },
        relations: ['educations'],
      });

      if (!job) {
        throw new NotFoundException(`Admin job #${id} not found`);
      }

      const { requiredEducationIds, ...jobData } = dto;

      Object.assign(job, jobData);

      if (requiredEducationIds !== undefined) {
        job.educations = await this.resolveEducations(requiredEducationIds);
      }

      const updatedJob = await this.jobRepo.save(job);

      return updatedJob;
    } catch (error) {
      handleDBError(error);
    }
  }

  async deleteAdminJob(id: number, deletedBy: string) {
    try {
      const job = await this.jobRepo.findOne({
        where: { id, createdByType: 'admin' },
      });

      if (!job) {
        throw new NotFoundException(`Admin job #${id} not found`);
      }

      job.deletedBy = deletedBy;
      await this.jobRepo.save(job);
      await this.jobRepo.softDelete(id);

      return { deleted: true };
    } catch (error) {
      handleDBError(error);
    }
  }

  async getAdminJobApplications(jobId: number, query: GetAllJobDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'application.id', order = 'ASC', filters, search } = query;

      const job = await this.jobRepo.findOne({
        where: { id: jobId, createdByType: 'admin' },
      });

      if (!job) {
        throw new NotFoundException(`Admin job #${jobId} not found`);
      }

      const qb = this.applicationRepo
        .createQueryBuilder('application')
        .leftJoinAndSelect('application.job', 'job')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .leftJoinAndSelect('candidate.user', 'user')
        .addSelect(['user.email'])
        .leftJoinAndSelect('application.resume', 'resume')
        .leftJoinAndSelect('application.kanbanBoardStatus', 'status')
        .leftJoinAndSelect('job.jobTitle', 'jobTitle')
        .where('job.id = :jobId', { jobId });

      if (search) {
        qb.andWhere(
          `(LOWER(candidate.firstName) LIKE :search OR LOWER(candidate.lastName) LIKE :search OR LOWER(jobTitle.name) LIKE :search)`,
          { search: `%${search.toLowerCase()}%` },
        );
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`application.${field} = :${field}`, { [field]: filters[field] });
        });
      }

      qb.orderBy(sortBy, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      if (limit && page) qb.skip((+page - 1) * +limit).take(+limit);

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }
}