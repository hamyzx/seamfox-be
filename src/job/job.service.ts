import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository,Not } from 'typeorm';
import { JobStatus } from '../lib/enums/job.enum';
import { Job } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { GetAllJobDto } from './dto/get-all-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Application } from '../application/entities/application.entity';
import { KanbanBoardService } from '../company/kanban-board/kanban-board.service';
import { JobTitle } from './entities/job-title.entity';
import { CreateJobTitleDto } from './dto/create-job-title.dto';
import { UpdateJobTitleDto } from './dto/update-job-title.dto';
import { handleDBError } from '../lib/error/dataBaseError';
import { SubscriptionService } from '../subscription/subscription.service';
import { JobSubscription } from './entities/job-subscription.entity';
import { CompanyStatus } from '../lib/enums/company.enum';


@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
    @InjectRepository(JobSubscription)
    private jobSubRepo: Repository<JobSubscription>,
    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>,
    private readonly kanbanBoardService: KanbanBoardService,
    @InjectRepository(Application) private applicationRepo: Repository<Application>,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  private async getFilledPositions(jobId: number): Promise<number> {
    return this.applicationRepo
      .createQueryBuilder('app')
      .leftJoin('app.kanbanBoardStatus', 'kbs')
      .leftJoin('kbs.coreStatus', 'cs')
      .where('app.jobId = :jobId', { jobId })
      .andWhere("LOWER(cs.name) IN ('hired', 'successful')")
      .getCount();
  }

  async create(dto: CreateJobDto): Promise<Job> {
    try {
      if (!dto.companyId) {
        throw new BadRequestException('companyId is required for company jobs');
      }

      if (!dto.createdByType) {
        dto.createdByType = 'company';
      }

      const limit = await this.subscriptionService.getFeatureLimit(dto.createdBy, 1);
      const subscriptionId = limit?.id ?? null;

      console.log('[Job create] userId:', dto.createdBy, 'companyId:', dto.companyId, 'featureLimit:', limit);

      let postedJobs = subscriptionId
        ? await this.jobSubRepo.findOne({
            where: { companyId: dto.companyId, subscriptionId },
          })
        : null;

      if (
        limit !== null &&
        limit.limit !== '' &&
        limit.limit !== 'true' &&
        limit.limit?.toLowerCase() !== 'unlimited'
      ) {
        const maxJobs = Number(limit.limit);
        if (!isNaN(maxJobs) && (postedJobs?.count ?? 0) >= maxJobs) {
          throw new BadRequestException(
            `Your job posting limit (${maxJobs}) has been reached. Upgrade your plan to post more jobs.`,
          );
        }
      }

      const kanbanBoard = await this.kanbanBoardService.getBoard(dto.companyId);
      dto.kanbanBoardId = kanbanBoard.id;

      const { requiredEducationIds, ...jobData } = dto as any;
      const job = this.jobRepo.create(jobData as any) as any;
      if (Array.isArray(requiredEducationIds) && requiredEducationIds.length > 0) {
        job.educations = requiredEducationIds.map((eduId: any) => ({
          id: Number(eduId),
        }));
      }

      if (subscriptionId) {
        if (!postedJobs) {
          postedJobs = this.jobSubRepo.create({
            companyId: dto.companyId,
            subscriptionId,
            count: 0,
            createdBy: dto.createdBy,
          });
        }

        postedJobs.count += 1;
        await this.jobSubRepo.save(postedJobs);
      } else {
        console.log('[Job create] no active subscription found — skipping job usage tracking');
      }

      return this.jobRepo.save(job);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAll(query: GetAllJobDto, userId: string) {
    try {
      console.log('[Job findAll] raw query:', JSON.stringify(query));
      const q = query as any;
      const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', filters, search } = q;
      const searchType = q.searchType as 'title' | 'company' | undefined;

      const qb = this.jobRepo
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.jobTitle', 'jobTitle')
        .leftJoinAndSelect('job.jobLanguages', 'jobLanguages')
        .leftJoinAndSelect('jobLanguages.language', 'language')
        .leftJoinAndSelect('job.education', 'education')
        .leftJoinAndSelect('job.educations', 'educations')
        .leftJoinAndSelect('job.company', 'company')
        .loadRelationCountAndMap('job.applicationCount', 'job.applications');

      const rawCompanyId =
        q.companyId ??
        (q.filters && typeof q.filters === 'object'
          ? (q.filters as any).companyId
          : undefined);
      const companyIdFilter =
        rawCompanyId !== undefined &&
          rawCompanyId !== null &&
          String(rawCompanyId).trim() !== ''
          ? Number(rawCompanyId)
          : null;

      if (companyIdFilter !== null && !isNaN(companyIdFilter)) {
        qb.andWhere('job.companyId = :companyIdFilter', { companyIdFilter });
      } else {
        qb.andWhere(`job.status != 'Draft'`);
        qb.andWhere(
          `(
              job.createdByType = 'admin'
              OR company.status = :approvedCompanyStatus
            )`,
          { approvedCompanyStatus: CompanyStatus.APPROVED },
        );
      }

      if (search) {
        const cleanedSearch = String(search).toLowerCase().trim();
        const isSearchingSeamfox = cleanedSearch.includes('seamfox');

        if (searchType === 'company') {
          if (isSearchingSeamfox) {
            qb.andWhere(
              `(
                LOWER(company.name) LIKE :cSearch OR
                LOWER(job.companyName) LIKE :cSearch OR
                (job.hideCompanyName = true AND job.createdByType = 'admin')
              )`,
              { cSearch: `%${cleanedSearch}%` },
            );
          } else {
            qb.andWhere(
              `(
                (LOWER(company.name) LIKE :cSearch AND job.createdByType = 'company') OR
                (LOWER(job.companyName) LIKE :cSearch AND (job.hideCompanyName = false OR job.hideCompanyName IS NULL))
              )`,
              { cSearch: `%${cleanedSearch}%` },
            );
          }
        } else if (searchType === 'title') {
          qb.andWhere(
            `(
              LOWER(jobTitle.name) LIKE :tSearch OR
              LOWER(job.description) LIKE :tSearch OR
              LOWER(job.responsibilities) LIKE :tSearch OR
              LOWER(job.department) LIKE :tSearch
            )`,
            { tSearch: `%${cleanedSearch}%` },
          );
        } else {
          const noiseWords = ['years', 'year', 'yrs', 'yr', 'experience', 'exp'];
          const normalized = cleanedSearch
            .replace(/(\d+)\s*(years?|yrs?|exp)/gi, '$1')
            .replace(/[+]/g, ' ')
            .trim();
          const words = normalized
            .split(/\s+/)
            .map((w: string) => w.trim())
            .filter((w: string) => w.length > 0 && !noiseWords.includes(w));
          if (words.length === 0) {
            words.push(cleanedSearch.replace(/[+]/g, '').trim());
          }
          words.forEach((word, i) => {
            const matchesSeamfox = word.includes('seamfox');
            qb.andWhere(
              `(
                LOWER(jobTitle.name) LIKE :w${i} OR
                LOWER(company.name) LIKE :w${i} OR
                (LOWER(job.companyName) LIKE :w${i} AND (job.hideCompanyName = false OR job.hideCompanyName IS NULL))
                ${matchesSeamfox ? "OR (job.hideCompanyName = true AND job.createdByType = 'admin')" : ''}
                OR LOWER(job.description) LIKE :w${i}
                OR LOWER(job.responsibilities) LIKE :w${i}
                OR LOWER(job.additionalRequirements) LIKE :w${i}
                OR LOWER(job.department) LIKE :w${i}
                OR LOWER(CAST(job.workMode AS TEXT)) LIKE :w${i}
                OR LOWER(CAST(job.employmentType AS TEXT)) LIKE :w${i}
                OR LOWER(job.address) LIKE :w${i}
                OR LOWER(job.city) LIKE :w${i}
                OR LOWER(job.country) LIKE :w${i}
                OR CAST(job.minExperience AS TEXT) LIKE :w${i}
                OR CAST(job.maxExperience AS TEXT) LIKE :w${i}
                OR LOWER(job.salary) LIKE :w${i}
                OR LOWER(job.salaryCurrency) LIKE :w${i}
                OR LOWER(CAST(job.jobLevel AS TEXT)) LIKE :w${i}
              )`,
              { [`w${i}`]: `%${word}%` },
            );
          });
        }
      }

      if (filters && typeof filters === 'object') {
        const expMinRaw = (filters as any).experienceMin;
        const expMaxRaw = (filters as any).experienceMax;
        const cMin =
          expMinRaw !== null && expMinRaw !== undefined && String(expMinRaw).trim() !== ''
            ? parseInt(String(expMinRaw).trim(), 10)
            : null;
        const cMax =
          expMaxRaw !== null && expMaxRaw !== undefined && String(expMaxRaw).trim() !== ''
            ? parseInt(String(expMaxRaw).trim(), 10)
            : null;

        if (cMin !== null && !isNaN(cMin) && cMax !== null && !isNaN(cMax)) {
          qb.andWhere(
            `(job.minExperience <= :cMax AND COALESCE(job.maxExperience, job.minExperience) >= :cMin)`,
            { cMin, cMax },
          );
        } else if (cMin !== null && !isNaN(cMin)) {
          qb.andWhere(
            `(COALESCE(job.maxExperience, job.minExperience) >= :cMin)`,
            { cMin },
          );
        } else if (cMax !== null && !isNaN(cMax)) {
          qb.andWhere(`(job.minExperience <= :cMax)`, { cMax });
        }

        Object.keys(filters).forEach((field) => {
          if (field === 'experienceMin' || field === 'experienceMax') return;
          if (field === 'companyId') return;
          const rawValue = filters[field];
          if (rawValue === null || rawValue === undefined || rawValue === '') return;

          if (field === 'requiredExperience' || field === 'experience') {
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];
            const validRanges = values.filter(
              (v: any) => typeof v === 'string' && v.trim().length > 0,
            );
            if (validRanges.length === 0) return;

            const conditions: string[] = [];
            const params: Record<string, any> = {};

            validRanges.forEach((range: string, i: number) => {
              const trimmed = range.trim();
              if (trimmed.endsWith('+')) {
                const min = parseInt(trimmed.replace('+', ''), 10);
                if (!isNaN(min)) {
                  conditions.push(
                    `(job.maxExperience >= :expMin${i} OR (job.maxExperience IS NULL AND job.minExperience >= :expMin${i}))`,
                  );
                  params[`expMin${i}`] = min;
                }
              } else if (trimmed.includes('-')) {
                const [minStr, maxStr] = trimmed.split('-');
                const min = parseInt(minStr, 10);
                const max = parseInt(maxStr, 10);
                if (!isNaN(min) && !isNaN(max)) {
                  conditions.push(
                    `(job.minExperience <= :expMax${i} AND COALESCE(job.maxExperience, job.minExperience) >= :expMin${i})`,
                  );
                  params[`expMin${i}`] = min;
                  params[`expMax${i}`] = max;
                }
              } else {
                const exact = parseInt(trimmed, 10);
                if (!isNaN(exact)) {
                  conditions.push(
                    `(job.minExperience <= :expExact${i} AND COALESCE(job.maxExperience, job.minExperience) >= :expExact${i})`,
                  );
                  params[`expExact${i}`] = exact;
                }
              }
            });

            if (conditions.length > 0) {
              qb.andWhere(`(${conditions.join(' OR ')})`, params);
            }
            return;
          }

          const values = Array.isArray(rawValue) ? rawValue : [rawValue];
          const cleanValues = values.filter(
            (v: any) => v !== null && v !== undefined && v !== '',
          );
          if (cleanValues.length === 0) return;

          if (field === 'salaryCurrency') {
            const upperValues = cleanValues.map((v: any) => String(v).toUpperCase());
            qb.andWhere(
              `UPPER(job.${field}) IN (:...${field}Values)`,
              { [`${field}Values`]: upperValues },
            );
          } else {
            qb.andWhere(
              `job.${field} IN (:...${field}Values)`,
              { [`${field}Values`]: cleanValues },
            );
          }
        });
      }

      qb.orderBy(`job.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      qb.skip((+page - 1) * +limit).take(+limit);

      const [jobs, total] = await qb.getManyAndCount();
      console.log('[Job findAll] result total:', total, '| jobs on page:', jobs.length);
      const jobIds = jobs.map((job) => job.id);

      const hiredCounts = await this.applicationRepo
        .createQueryBuilder('app')
        .leftJoin('app.kanbanBoardStatus', 'kbs')
        .leftJoin('kbs.coreStatus', 'cs')
        .select('app.jobId', 'jobId')
        .addSelect('COUNT(app.id)', 'count')
        .where('app.jobId IN (:...jobIds)', { jobIds: jobIds.length ? jobIds : [0] })
        .andWhere("LOWER(cs.name) IN ('hired', 'successful')")
        .groupBy('app.jobId')
        .getRawMany();

      const hiredMap = new Map(
        hiredCounts.map((r) => [Number(r.jobId), Number(r.count)]),
      );

      const appliedJobs = await this.applicationRepo.find({
        where: { jobId: In(jobIds), candidate: { userId } },
        select: ['jobId'],
      });

      const appliedJobIds = new Set(appliedJobs.map((a) => a.jobId));

      const data = jobs.map((job) => ({
        ...job,
        isApplied: appliedJobIds.has(job.id),
        filledPositions: hiredMap.get(job.id) ?? 0,
        totalPositions: job.totalPositions ?? 1,
        company:
          job.createdByType === 'admin' && job.hideCompanyName
            ? {
              ...job.company,
              name: 'Seamfox',
              logo: '/seamfox-logo.png',
            }
            : job.company,
        companyName:
          job.createdByType === 'admin'
            ? job.hideCompanyName
              ? 'Seamfox'
              : job.companyName
            : job.company?.name,
        companyLogo:
          job.createdByType === 'admin'
            ? job.hideCompanyName
              ? '/seamfox-logo.png'
              : job.companyLogo
            : job.company?.logo,
      }));

      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }

  async findPublicMeta(id: number) {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['company', 'jobTitle'],
    });

    if (!job) throw new NotFoundException(`Job #${id} not found`);

    const isAdmin = job.createdByType === 'admin';
    const hidden = !!job.hideCompanyName;

    const companyName = isAdmin
      ? hidden
        ? 'Seamfox'
        : job.companyName
      : job.company?.name || null;

    const companyAny = (job.company as any) || {};
    const resolvedCompanyLogo =
      job.companyLogo ||
      companyAny.logo ||
      companyAny.logoUrl ||
      companyAny.image ||
      companyAny.companyLogo ||
      companyAny.profileImage ||
      null;

    const companyLogo = isAdmin
      ? hidden
        ? '/seamfox-logo.png'
        : resolvedCompanyLogo
      : resolvedCompanyLogo;

    return {
      id: job.id,
      title: job.jobTitle?.name || 'Job Opportunity',
      companyName,
      companyLogo,
      city: job.city || null,
      country: job.country || null,
      shortDescription: job.description
        ? String(job.description).slice(0, 200)
        : null,
    };
  }

  async findOne(id: number, userId?: number): Promise<Job> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: [
        'applications',
        'applications.candidate',
        'company',
        'jobTitle',
        'company.user',
        'education',
        'educations',
        'jobLanguages',
        'jobLanguages.language',
      ],
    });

    if (!job) throw new NotFoundException(`Job #${id} not found`);

    let isApplied = false;
    if (userId) {
      isApplied = job.applications?.some((app) => app?.candidate?.id === userId) ?? false;
    }

    const filledPositions = await this.getFilledPositions(id);

    const result: any = {
      ...job,
      isApplied,
      filledPositions,
      totalPositions: job.totalPositions ?? 1,
    };

    return result;
  }

  async checkPositionAvailability(jobId: number, totalPositions: number): Promise<boolean> {
    const filled = await this.getFilledPositions(jobId);
    return filled < totalPositions;
  }

  async update(id: number, dto: UpdateJobDto): Promise<Job> {
    if (!dto.companyId) throw new BadRequestException('companyId is required');

    const job = await this.jobRepo.findOne({
      where: { id, companyId: dto.companyId },
      relations: [
        'applications',
        'applications.kanbanBoardStatus',
        'applications.kanbanBoardStatus.coreStatus',
      ],
    });

    if (!job) throw new NotFoundException(`Job #${id} against company id ${dto.companyId} not found`);

    if (dto.status && (dto.status === JobStatus.CLOSED || dto.status === JobStatus.ARCHIVED)) {
      const hasNonHiredApplications = job.applications.some(
        (app) =>
          app.kanbanBoardStatus?.coreStatus?.name !== 'Hired' &&
          app.kanbanBoardStatus?.coreStatus?.name !== 'Rejected',
      );

      if (hasNonHiredApplications) {
        throw new BadRequestException(
          'Please update all application statuses first before closing/archiving the job.',
        );
      }
    }

    const { requiredEducationIds, ...updateData } = dto as any;
    Object.assign(job, updateData);
    if (Array.isArray(requiredEducationIds)) {
      (job as any).educations = requiredEducationIds.map((eduId: any) => ({
        id: Number(eduId),
      }));
    }
    return this.jobRepo.save(job);
  }

  async updateJobStatus(id: number, newStatus: JobStatus, companyId: number, userId: string): Promise<Job> {
    const job = await this.jobRepo.findOne({ where: { id, companyId } });
    if (!job) throw new NotFoundException(`Job not found against your company`);
    job.status = newStatus;
    job.updatedBy = userId;
    return this.jobRepo.save(job);
  }

  async countAll(): Promise<number> {
    return this.jobRepo.count();
  }

  async createJobTitle(dto: CreateJobTitleDto): Promise<JobTitle> {
    try {
      const jobTitle = this.jobTitleRepo.create(dto);
      return await this.jobTitleRepo.save(jobTitle);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAllJobTitle(query: GetAllJobDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', filters, search } = query;
      const qb = this.jobTitleRepo.createQueryBuilder('jobTitle');

      if (search) {
        qb.andWhere(
          '(LOWER(jobTitle.name) LIKE :search OR LOWER(jobTitle.description) LIKE :search)',
          { search: `%${search.toLowerCase()}%` },
        );
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`jobTitle.${field} = :${field}`, { [field]: filters[field] });
        });
      }

      qb.orderBy(`jobTitle.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

      if (limit && page) {
        qb.skip((+page - 1) * +limit).take(+limit);
      }

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateJobTitle(id: number, dto: UpdateJobTitleDto) {
    try {
      await this.jobTitleRepo.update(id, dto);
      return await this.jobTitleRepo.findOne({ where: { id } });
    } catch (error) {
      handleDBError(error);
    }
  }

  async removeJobTitle(id: number, deletedBy: string) {
    try {
      await this.jobTitleRepo.update(id, { deletedBy });
      return this.jobTitleRepo.softDelete(id);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findJobsByCompany(companyId: number, candidateId?: string) {
    const numericCompanyId = Number(companyId);
    if (!numericCompanyId || isNaN(numericCompanyId)) return [];

    const jobs = await this.jobRepo.find({
      where: { companyId: numericCompanyId,status: JobStatus.OPENED, },
      
      relations: ['jobTitle', 'company'],
    });

    if (!jobs.length) return [];

    const jobIds = jobs.map((j) => j.id);

    const hiredCounts = await this.applicationRepo
      .createQueryBuilder('app')
      .leftJoin('app.kanbanBoardStatus', 'kbs')
      .leftJoin('kbs.coreStatus', 'cs')
      .select('app.jobId', 'jobId')
      .addSelect('COUNT(app.id)', 'count')
      .where('app.jobId IN (:...jobIds)', { jobIds })
      .andWhere("LOWER(cs.name) IN ('hired', 'successful')")
      .groupBy('app.jobId')
      .getRawMany();

    const hiredMap = new Map(
      hiredCounts.map((r) => [Number(r.jobId), Number(r.count)]),
    );

    let appliedJobIds = new Set<number>();

    const numericCandidateId = Number(candidateId);
    if (candidateId && !isNaN(numericCandidateId) && numericCandidateId > 0) {
      const applied = await this.applicationRepo.find({
        where: { jobId: In(jobIds), candidateId: numericCandidateId },
        select: ['jobId'],
      });
      appliedJobIds = new Set(applied.map((a) => a.jobId));
    }

    return jobs.map((job) => ({
      ...job,
      isAppliedCandidate: appliedJobIds.has(job.id),
      filledPositions: hiredMap.get(job.id) ?? 0,
      totalPositions: job.totalPositions ?? 1,
    }));
  }
async listJobsByCompany(companyId: number, candidateId?: string) {
  const numericCompanyId = Number(companyId);

  if (!numericCompanyId || Number.isNaN(numericCompanyId)) {
    return [];
  }

  const jobs = await this.jobRepo.find({
    where: {
      companyId: numericCompanyId,
      status: Not(JobStatus.DRAFT),
    },
    relations: ['jobTitle', 'company'],
    order: {
      createdAt: 'DESC',
    },
  });

  if (!jobs.length) {
    return [];
  }

  const jobIds = jobs.map((job) => job.id);

  const applicationStats = await this.applicationRepo
    .createQueryBuilder('app')
    .leftJoin('app.kanbanBoardStatus', 'kbs')
    .leftJoin('kbs.coreStatus', 'cs')
    .select('app.jobId', 'jobId')
    .addSelect('COUNT(app.id)', 'applicationCount')
    .addSelect(
      `
        SUM(
          CASE
            WHEN LOWER(cs.name) IN ('hired', 'successful')
            THEN 1
            ELSE 0
          END
        )
      `,
      'filledPositions',
    )
    .where('app.jobId IN (:...jobIds)', { jobIds })
    .groupBy('app.jobId')
    .getRawMany<{
      jobId: string;
      applicationCount: string;
      filledPositions: string;
    }>();

  const statsMap = new Map<
    number,
    {
      applicationCount: number;
      filledPositions: number;
    }
  >();

  applicationStats.forEach((row) => {
    statsMap.set(Number(row.jobId), {
      applicationCount: Number(row.applicationCount || 0),
      filledPositions: Number(row.filledPositions || 0),
    });
  });

  let appliedJobIds = new Set<number>();

  const numericCandidateId = Number(candidateId);

  if (
    candidateId &&
    !Number.isNaN(numericCandidateId) &&
    numericCandidateId > 0
  ) {
    const applications = await this.applicationRepo.find({
      where: {
        jobId: In(jobIds),
        candidateId: numericCandidateId,
      },
      select: ['jobId'],
    });

    appliedJobIds = new Set(
      applications.map((application) => application.jobId),
    );
  }

  return jobs.map((job) => {
    const stats = statsMap.get(job.id);

    return {
      ...job,
      applicationCount: stats?.applicationCount ?? 0,
      filledPositions: stats?.filledPositions ?? 0,
      totalPositions: job.totalPositions ?? 1,
      isAppliedCandidate: appliedJobIds.has(job.id),
    };
  });
}
}