import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, DeleteResult, MoreThanOrEqual, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Candidate } from './entities/candidate.entity';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { GetAllCandidateDto } from './dto/get-all-candidate.dto';
import { handleDBError } from '../lib/error/dataBaseError';
import { toLowerCaseFields } from '../lib/helpers/convertToLowercase';
import { CandidateStatusHistory } from '../candidate-status-history/entities/candidate-status-history.entity';
import { EmailService } from '../services/mail.service';
import { CandidateStatus } from '../lib/enums/candidate.enum';
import { CandidateProfileView } from './entities/candidate-profile-view.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { LoginActivity } from '../auth/entities/login-activity.entity';
import { UserRoles } from '../lib/enums/user.enum';

import {
  getRegistrationCompleteTemplate,
  getRegistrationCompleteText,
  getProfileApprovedTemplate,
  getProfileApprovedText,
  getProfileRejectedTemplate,
  getProfileRejectedText,
  getProfileRejectedPermanentTemplate,
  getProfileRejectedPermanentText,
  getAccountSuspendedTemplate,
  getAccountSuspendedText,
} from '../lib/templates/onboarding.template';

import {
  getNewMemberRegistrationTemplate,
  getNewMemberRegistrationText,
} from '../lib/templates/admin-alerts.template';
import { JobTitle } from '../job/entities/job-title.entity';
import { Application } from '../application/entities/application.entity';

@Injectable()
export class CandidateService {
  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,

    @InjectRepository(CandidateStatusHistory)
    private candidateStatusHistoryRepo: Repository<CandidateStatusHistory>,

    @InjectRepository(CandidateProfileView)
    private profileViewRepo: Repository<CandidateProfileView>,

    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>,

    @InjectRepository(LoginActivity)
    private loginActivityRepo: Repository<LoginActivity>,

    @InjectRepository(Application)
    private applicationRepo: Repository<Application>,

    private readonly emailService: EmailService,
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) { }

  async create(dto: CreateCandidateDto): Promise<Candidate> {
    try {
      await this.resolveJobTitle(dto, dto.userId);
      const smallCaseDTO = toLowerCaseFields(dto);
      const candidate = this.candidateRepository.create({
        ...smallCaseDTO,
        status: CandidateStatus.UNDER_REVIEW,
      });
      const saved = await this.candidateRepository.save(candidate);

      const candidateWithUser = await this.candidateRepository.findOne({
        where: { id: saved.id },
        relations: ['user', 'jobTitle'],
      });

      try {
        if (candidateWithUser?.user?.email) {
          const firstName = candidateWithUser.firstName || 'there';
          await this.emailService.send({
            to: candidateWithUser.user.email,
            subject: 'Welcome to Seamfox — Your profile is under review',
            html: getRegistrationCompleteTemplate({ firstName }),
            text: getRegistrationCompleteText({ firstName }),
          });
        }
      } catch (err) {
        console.warn('[CandidateService] Registration Complete email failed:', err);
      }

      try {
        if (candidateWithUser) {
          await this.notifyAdminsAboutNewMember(candidateWithUser);
        }
      } catch (err) {
        console.warn('[CandidateService] Admin notification failed:', err);
      }

      return saved;
    } catch (error) {
      handleDBError(error);
    }
  }


  private async notifyAdminsAboutNewMember(candidate: Candidate): Promise<void> {
    // Fetch all SUPER_ADMIN active users
    const admins: { email: string }[] = await this.dataSource.query(
      `
      SELECT u.email
      FROM "users" u
      WHERE u.role = $1
        AND u.email IS NOT NULL
        AND u.email != ''
        AND u.status = 'ACTIVE'
      `,
      [UserRoles.SUPER_ADMIN],
    );

    // Always include support email too (failsafe)
    const allRecipients = Array.from(
      new Set([
        ...admins.map((a) => a.email),
        'support@seamfox.com',
      ]),
    );

    if (!allRecipients.length) {
      console.warn('[notifyAdminsAboutNewMember] No recipients found');
      return;
    }

    const memberName =
      `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'New Member';
    const memberEmail = candidate.user?.email || 'N/A';
    const dateTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const currentRole =
      (candidate as any).jobTitle?.name || candidate.currentCompany || undefined;
    const location =
      [candidate.city, candidate.country].filter(Boolean).join(', ') || undefined;

    console.log(
      `[notifyAdminsAboutNewMember] Sending alert to ${allRecipients.length} recipients about ${memberName}`,
    );

    // Send to all admins in parallel
    await Promise.allSettled(
      allRecipients.map((email) =>
        this.emailService.send({
          to: email,
          subject: 'New Member Registration — Profile Pending Review',
          html: getNewMemberRegistrationTemplate({
            memberName,
            memberEmail,
            dateTime,
            currentRole,
            location,
            candidateId: candidate.id,
          }),
          text: getNewMemberRegistrationText({
            memberName,
            memberEmail,
            dateTime,
            currentRole,
            location,
            candidateId: candidate.id,
          }),
        }),
      ),
    );

    console.log('[notifyAdminsAboutNewMember] ✅ Admin alerts sent');
  }

  async findAll(query: GetAllCandidateDto, user: any) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'DESC',
      filters,
      search,
      status,
      premiumFirst = 'false',
    } = query;

    const qb = this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.user', 'user')
      .leftJoinAndSelect('candidate.languages', 'candidateLanguages')
      .leftJoinAndSelect('candidateLanguages.language', 'language')
      .leftJoinAndSelect('candidate.candidateNationalities', 'candidateNationalities')
      .leftJoinAndSelect('candidateNationalities.nationality', 'nationality')
      .leftJoinAndSelect('candidate.jobTitle', 'jobTitle')
      .leftJoin('industry', 'ind', 'ind.id = candidate.industryId')
      .addSelect('user.status', 'user_status');

    qb.leftJoin(
      'subscriptions',
      'subscription',
      `subscription."userId" = candidate."userId" AND subscription.status = 'ACTIVE'`,
    )
      .leftJoin(
        'packages',
        'package',
        `package.id = subscription."packageId" AND package.role = 'CANDIDATE'`,
      )
      .addSelect(`CASE WHEN package.id = 8 THEN 1 ELSE 0 END`, 'premium_order')
      .addSelect(`CASE WHEN package.id = 8 THEN true ELSE false END`, 'isPremium')
      .addSelect('package.title', 'packageTitle');

    if (search) {
      const words = search.toLowerCase().trim().split(/\s+/);
      words.forEach((word, i) => {
        const term = `%${word}%`;
        qb.andWhere(
          `(
            LOWER(candidate.firstName) LIKE :term${i}
            OR LOWER(candidate.lastName) LIKE :term${i}
            OR LOWER(CONCAT(candidate.firstName, ' ', candidate.lastName)) LIKE :term${i}
            OR LOWER(jobTitle.name) LIKE :term${i}
            OR LOWER(ind.name) LIKE :term${i}
            OR LOWER(ind.function) LIKE :term${i}
          )`,
          { [`term${i}`]: term },
        );
      });
    }

    if (status) {
      qb.andWhere('LOWER(candidate.status::text) = :status', {
        status: status.toLowerCase(),
      });
    }

    if (filters?.country) {
      qb.andWhere(`(LOWER(candidate.country) = :country OR LOWER(nationality.name) = :country)`, {
        country: filters.country.toLowerCase(),
      });
    }

    if (filters?.city) {
      qb.andWhere('LOWER(candidate.city) = :city', { city: filters.city.toLowerCase() });
    }

    if (filters?.currency) {
      qb.andWhere('LOWER(candidate.currency) = :currency', {
        currency: filters.currency.toLowerCase(),
      });
    }

    if (filters?.minSalary) {
      qb.andWhere(
        '(candidate.minSalary <= :minSalary AND candidate."isCurrentSalaryConfidential" = false)',
        { minSalary: Number(filters.minSalary) },
      );
    }

    if (filters?.maxSalary) {
      qb.andWhere(
        '(candidate.maxSalary >= :maxSalary AND candidate."isExpectedSalaryConfidential" = false)',
        { maxSalary: Number(filters.maxSalary) },
      );
    }

    if (filters?.jobRole) {
      qb.andWhere('candidate.jobTitleId = :jobRole', { jobRole: Number(filters.jobRole) });
    }

    if (filters?.industry) {
      const isNumeric = !isNaN(Number(filters.industry));
      if (isNumeric) {
        qb.andWhere('candidate.industryId = :industry', { industry: Number(filters.industry) });
      } else {
        qb.andWhere('LOWER(ind.name) = :industryName', {
          industryName: filters.industry.toLowerCase(),
        });
      }
    }

    if (filters?.currentCompany) {
      qb.andWhere('LOWER(candidate.currentCompany) LIKE :currentCompany', {
        currentCompany: `%${filters.currentCompany.toLowerCase()}%`,
      });
    }

    if (filters?.nationality) {
      qb.andWhere('LOWER(nationality.name) LIKE :nationality', {
        nationality: `%${filters.nationality.toLowerCase()}%`,
      });
    }

    if (filters?.language) {
      qb.andWhere('LOWER(language.name) LIKE :language', {
        language: `%${filters.language.toLowerCase()}%`,
      });
    }

    if (filters?.noticePeriod) {
      // Candidates store notice period as a free-form number of DAYS (stored as
      // text). Match everyone whose notice period is <= the selected number of
      // days. The regex guard skips empty / non-numeric values so CAST is safe.
      qb.andWhere(
        `(candidate.noticePeriod ~ '^[0-9]+$' AND CAST(candidate.noticePeriod AS INTEGER) <= :noticePeriod)`,
        { noticePeriod: Number(filters.noticePeriod) },
      );
    }

    if (filters?.premiumFirst === 'true') {
      qb.orderBy('premium_order', 'DESC');
      qb.addOrderBy(`candidate.${sortBy}`, order as 'ASC' | 'DESC');
    } else {
      qb.orderBy(`candidate.${sortBy}`, order as 'ASC' | 'DESC');
    }

    qb.skip((+page - 1) * +limit).take(+limit);

    const { entities, raw } = await qb.getRawAndEntities();

    const data = entities.map((candidate) => {
      const rawRow = raw.find((r) => r.candidate_userId === candidate.userId);
      return {
        ...candidate,
        minSalary: candidate.isCurrentSalaryConfidential ? null : candidate.minSalary,
        maxSalary: candidate.isExpectedSalaryConfidential ? null : candidate.maxSalary,
        isPremium: rawRow?.isPremium === true || rawRow?.isPremium === 'true',
        packageTitle: rawRow?.packageTitle || null,
        isBanned: (rawRow?.user_status ?? candidate.user?.status) === 'BAN',
      };
    });

    const total = await qb.getCount();
    return { data, total, page: +page, limit: +limit };
  }

  async getMyProfile(userId: string): Promise<any> {
    const candidate = await this.candidateRepository.findOne({
      where: { userId },
      relations: [
        'user',
        'education',
        'certifications',
        'resumes',
        'candidateSkills',
        'candidateSkills.skill',
        'socialProfiles',
        'languages',
        'languages.language',
        'candidateNationalities',
        'candidateNationalities.nationality',
        'jobTitle',
        'experiences', // 🔥 ADDED — Include work experience records
      ],
    });

    if (!candidate) {
      return null;
    }

    let latestRejectionComment: string | null = null;
    if (candidate.status === CandidateStatus.REJECTED) {
      const lastRejection = await this.candidateStatusHistoryRepo.findOne({
        where: {
          candidate: { id: candidate.id } as any,
          status: CandidateStatus.REJECTED,
        },
        order: { createdAt: 'DESC' } as any,
      });
      latestRejectionComment = lastRejection?.comment || null;
    }

    return {
      ...candidate,
      latestRejectionComment,
    };
  }

  private async getCandidateActivityCounts(candidateId: number) {
    const rows = await this.applicationRepo
      .createQueryBuilder('app')
      .leftJoin('app.kanbanBoardStatus', 'kbs')
      .leftJoin('kbs.coreStatus', 'cs')
      .select('LOWER(cs.name)', 'statusName')
      .addSelect('COUNT(app.id)', 'count')
      .where('app.candidateId = :candidateId', { candidateId })
      .groupBy('LOWER(cs.name)')
      .getRawMany();

    let appliedJobsCount = 0;
    let shortlistedCount = 0;
    let interviewsCount = 0;

    for (const row of rows) {
      const count = Number(row.count) || 0;
      const name = (row.statusName || '').trim();

      appliedJobsCount += count;

      if (name.includes('shortlist')) shortlistedCount += count;
      if (name.includes('interview')) interviewsCount += count;
    }

    return { appliedJobsCount, shortlistedCount, interviewsCount };
  }

  async findOne(
    id: number,
    companyUser?: { role: string; companyId: number; userId: string },
  ): Promise<any> {
    const candidate = await this.candidateRepository.findOne({
      where: { id },
      relations: [
        'user',
        'education',
        'certifications',
        'resumes',
        'candidateSkills',
        'candidateSkills.skill',
        'socialProfiles',
        'languages',
        'languages.language',
        'candidateNationalities',
        'candidateNationalities.nationality',
        'jobTitle',
        'experiences', // 🔥 ADDED — Include work experience records
      ],
    });

    if (!candidate) throw new NotFoundException(`Candidate #${id} not found`);

    let lastLoginAt: Date | null = null;
    if (candidate.user.id) {
      const result = await this.loginActivityRepo
        .createQueryBuilder('log')
        .select('MAX(log."loginAt")', 'lastLogin')
        .where('log."userId" = :userId', { userId: candidate.user.id })
        .andWhere('log."userType" = :type', { type: 'CANDIDATE' })
        .getRawOne();
      lastLoginAt = result?.lastLogin ? new Date(result.lastLogin) : null;
    }

    const isBanned = candidate.user?.status === 'BAN';

    const activityCounts = await this.getCandidateActivityCounts(id);

    if (companyUser?.role === 'COMPANY') {
      const companyId = companyUser.companyId;
      const profileViewLimit = await this.subscriptionService.getFeatureLimit(
        companyUser.userId,
        10,
      );
      const alreadyViewed = await this.profileViewRepo.findOne({
        where: { companyId, candidateId: id, subscriptionId: profileViewLimit?.id },
      });
      const totalViewCount = await this.profileViewRepo.count({
        where: { companyId, subscriptionId: profileViewLimit?.id },
      });

      if (
        !alreadyViewed &&
        profileViewLimit !== null &&
        profileViewLimit.limit !== '' &&
        profileViewLimit.limit !== 'true' &&
        profileViewLimit?.limit?.toLowerCase() !== 'unlimited' &&
        totalViewCount >= Number(profileViewLimit.limit)
      ) {
        throw new BadRequestException(
          `Monthly unique candidate view limit (${profileViewLimit.limit}) reached. Upgrade your plan.`,
        );
      }

      if (!alreadyViewed) {
        await this.profileViewRepo.save({
          companyId,
          candidateId: id,
          subscriptionId: profileViewLimit?.id,
        });
      }

      return {
        ...candidate,
        lastLoginAt,
        isBanned,
        ...activityCounts,
        user: {
          ...candidate.user,
          email: candidate.isEmailConfidential ? null : candidate.user?.email,
        },
        phoneNumber: candidate.isPhoneConfidential ? null : candidate.phoneNumber,
        countryCode: candidate.isPhoneConfidential ? null : candidate.countryCode,
        address: candidate.isAddressConfidential ? null : candidate.address,
        resumes: candidate.isCvConfidential ? [] : candidate.resumes,
        socialProfiles: candidate.isLinkedinConfidential
          ? candidate.socialProfiles?.map((sp) =>
            sp.platform === 'LINKEDIN' ? { ...sp, url: null } : sp,
          )
          : candidate.socialProfiles,
        minSalary: candidate.isCurrentSalaryConfidential ? null : candidate.minSalary,
        maxSalary: candidate.isExpectedSalaryConfidential ? null : candidate.maxSalary,
      };
    }

    return { ...candidate, lastLoginAt, isBanned, ...activityCounts };
  }

  async findByUserId(id: string): Promise<Candidate> {
    const candidate = await this.candidateRepository.findOne({ where: { userId: id } });
    if (!candidate) throw new NotFoundException(`Candidate by user ${id} not found`);
    return candidate;
  }

  async update(
    id: number,
    dto: UpdateCandidateDto,
    adminId?: string,
  ): Promise<Candidate | DeleteResult> {
    const candidate = await this.findOne(id);
    await this.resolveJobTitle(dto as any, candidate.userId || adminId);
    const statusChanged = dto.status && dto.status !== candidate.status;
    const { comment, adminId: dtoAdminId, ...candidateData } = dto;

    await this.candidateRepository.update(id, candidateData);

    if (statusChanged) {
      const firstName = candidate.firstName || 'Candidate';
      const candidateName =
        `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate';
      const recipientEmail = candidate.user?.email;
      const dateTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      if (recipientEmail) {
        try {
          if (dto.status === CandidateStatus.REQUEST_CHANGE) {
            // Changes Requested — candidate ko profile update/resubmit karna hai
            await this.emailService.send({
              to: recipientEmail,
              subject: 'Action Required: Update Your Seamfox Profile',
              html: getProfileRejectedTemplate({
                firstName,
                rejectionReason: dto.comment || undefined,
              }),
              text: getProfileRejectedText({
                firstName,
                rejectionReason: dto.comment || undefined,
              }),
            });
          } else if (dto.status === CandidateStatus.REJECTED) {
            // Permanent reject — resubmit nahi
            await this.emailService.send({
              to: recipientEmail,
              subject: 'Update on Your Seamfox Application',
              html: getProfileRejectedPermanentTemplate({
                firstName,
                rejectionReason: dto.comment || undefined,
              }),
              text: getProfileRejectedPermanentText({
                firstName,
                rejectionReason: dto.comment || undefined,
              }),
            });
          } else if (dto.status === CandidateStatus.APPROVED) {
            await this.emailService.send({
              to: recipientEmail,
              subject: 'Welcome to Seamfox — Your profile is approved!',
              html: getProfileApprovedTemplate({ candidateName }),
              text: getProfileApprovedText({ candidateName }),
            });
          } else if (dto.status === CandidateStatus.PENDING) {
            // Hold — account hold
            await this.emailService.send({
              to: recipientEmail,
              subject: 'Your Seamfox account is on hold',
              html: getAccountSuspendedTemplate({
                firstName,
                suspensionDate: dateTime,
                reason: dto.comment || undefined,
              }),
              text: getAccountSuspendedText({
                firstName,
                suspensionDate: dateTime,
                reason: dto.comment || undefined,
              }),
            });
          } else if (dto.status === CandidateStatus.UNDER_REVIEW) {
            // Under Review — profile review mein hai
            await this.emailService.send({
              to: recipientEmail,
              subject: 'Welcome to Seamfox — Your profile is under review',
              html: getRegistrationCompleteTemplate({ firstName }),
              text: getRegistrationCompleteText({ firstName }),
            });
          }
        } catch (err) {
          console.warn(`[CandidateService] Email send failed for candidate ${id}:`, err);
        }
      }

      await this.candidateStatusHistoryRepo.save({
        candidate: { id } as any,
        admin: adminId ? ({ id: adminId } as any) : null,
        status: dto.status,
        comment: dto.comment || null,
      } as DeepPartial<CandidateStatusHistory>);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const result = await this.candidateRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Candidate #${id} not found`);
    return result;
  }

  async countAll(): Promise<number> {
    return this.candidateRepository.count();
  }

  async getMonthlyProfileViewCount(companyId: number): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return this.profileViewRepo.count({
      where: { companyId, viewedAt: MoreThanOrEqual(startOfMonth) },
    });
  }

  private async resolveJobTitle(dto: any, createdBy?: string): Promise<void> {
    const name = (dto.jobTitleName || '').trim();
    if (!dto.jobTitleId && name) {
      let title = await this.jobTitleRepo
        .createQueryBuilder('jt')
        .withDeleted()
        .where('LOWER(jt.name) = LOWER(:name)', { name })
        .getOne();

      if (title && title.deletedAt) {
        await this.jobTitleRepo.restore(title.id);
      }
      if (!title) {
        const ownerId = createdBy || dto.userId;
        if (!ownerId) {
          throw new BadRequestException('Unable to create job title: missing user reference');
        }
        title = await this.jobTitleRepo.save(
          this.jobTitleRepo.create({ name, createdBy: ownerId }),
        );
      }
      dto.jobTitleId = title.id;
    }
    delete dto.jobTitleName;
  }
}