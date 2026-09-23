import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { GetAllApplicationDto } from './dto/get-all-application.dto';
import { ShortlistApplicationDto } from './dto/shortlist-application.dto';
import { JobService } from '../job/job.service';
import { KanbanBoardService } from '../company/kanban-board/kanban-board.service';
import { JobStatus } from '../lib/enums/job.enum';
import { handleDBError } from '../lib/error/dataBaseError';
import { NotificationProvider } from '../notification/notification.provider';
import { UserProvider } from '../user/user.provider';
import { NotificationTypes } from '../lib/enums/notification.enum';
import { UserRoles, UserStatus } from '../lib/enums/user.enum';
import { SendNotificationParams } from '../notification/notification.interface';
import { EmailService } from '../services/mail.service';
import { ResumeService } from '../resume/resume.service';
import { CandidateService } from '../candidate/candidate.service';
import { SendInterviewEmailDto } from './dto/send-interview-email.dto';
import { Job } from '../job/entities/job.entity';
import { User } from '../user/entities/user.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  getApplicationSubmittedTemplate,
  getApplicationSubmittedText,
  getAdminApplicationNotificationTemplate,
  getAdminApplicationNotificationText,
  getInterviewInvitationTemplate,
  getInterviewInvitationText,
  getInterviewScheduledTemplate,
  getInterviewScheduledText,
  getApplicationStatusUpdateTemplate,
  getApplicationStatusUpdateText,
} from '../lib/templates/jobs.template';


// const S3_BASE_URL_FALLBACK = 'https://seamfox-stage.s3.us-east-1.amazonaws.com';
const S3_BASE_URL_FALLBACK = 'https://seamfoxprod.s3.ap-southeast-1.amazonaws.com';

const S3_BASE_URL = (
  process.env.S3_BASE_URL ||
  process.env.AWS_S3_BASE_URL ||
  S3_BASE_URL_FALLBACK
).replace(/\/$/, '');

function buildS3Url(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const cleanPath = filePath.replace(/^\//, '');
  const url = `${S3_BASE_URL}/${cleanPath}`;
  console.log(`[buildS3Url] S3_BASE_URL: ${S3_BASE_URL} | filePath: ${filePath} | final: ${url}`);
  return url;
}

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,

    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly jobService: JobService,
    private readonly kanbanBoardService: KanbanBoardService,
    private readonly userProvider: UserProvider,
    private readonly notificationProvider: NotificationProvider,
    private readonly emailService: EmailService,
    private readonly resumeService: ResumeService,
    private readonly candidateService: CandidateService,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  private resolveCompanyName(job: any): string {
    if (job?.hideCompanyName) return 'Seamfox';
    return job?.company?.name || job?.companyName || 'Seamfox';
  }

  async create(dto: CreateApplicationDto, senderId: string): Promise<Application> {
    try {
      const job = await this.jobService.findOne(dto.jobId);
      if (!job || job.status !== JobStatus.OPENED)
        throw new NotFoundException(`No open job found against Job #${dto.jobId}`);

      const existing = await this.applicationRepo.findOne({
        where: { jobId: dto.jobId, candidateId: dto.candidateId },
        withDeleted: false,
      });
      if (existing) throw new BadRequestException('Candidate has already applied for this job');

      const featureLimit = await this.subscriptionService.getFeatureLimit(senderId, 4);
      if (featureLimit?.limit && featureLimit.limit !== 'unlimited') {
        const used = await this.applicationRepo.count({
          where: { candidateId: dto.candidateId },
        });
        if (used >= Number(featureLimit.limit)) {
          throw new BadRequestException(
            `Job application limit reached (${featureLimit.limit}). Please upgrade your plan to apply for more jobs.`,
          );
        }
      }

      const filledPositions = await this.applicationRepo
        .createQueryBuilder('app')
        .leftJoin('app.kanbanBoardStatus', 'kbs')
        .leftJoin('kbs.coreStatus', 'cs')
        .where('app.jobId = :jobId', { jobId: dto.jobId })
        .andWhere("LOWER(cs.name) IN ('hired', 'successful')")
        .getCount();

      const totalPositions = (job as any).totalPositions ?? 1;
      if (filledPositions >= totalPositions)
        throw new BadRequestException(
          `All ${totalPositions} position(s) for this role have been filled.`,
        );

      const kanbanBoard = await this.kanbanBoardService.getBoardById(job.kanbanBoardId);
      const appliedStatus =
        kanbanBoard.statuses.find(
          (item) =>
            item.isDefault &&
            item.coreStatus?.name?.toLowerCase() === 'applied',
        ) ||
        kanbanBoard.statuses.find(
          (item) => item.coreStatus?.name?.toLowerCase() === 'applied',
        ) ||
        kanbanBoard.statuses.find((item) => item.isDefault && item.order == 1) ||
        kanbanBoard.statuses.find((item) => item.order == 1);

      if (!appliedStatus)
        throw new BadRequestException('Applied column not found on this job board');

      const application = this.applicationRepo.create({
        ...dto,
        kanbanBoardStatusId: appliedStatus.id,
      });
      const applicationResult = await this.applicationRepo.save(application);

      const deepLink = `'http://staging-portal.seamfox.com/chat'}?c=${application.id}`;
      const frontendBaseUrl = 'http://staging-portal.seamfox.com/';
      const applicationUrl = `${frontendBaseUrl}/company/applications/${dto.jobId}?application-id=${applicationResult.id}`;

      if (job.createdByType === 'company' && job.company?.user?.id) {
        const params: SendNotificationParams = {
          recipientIds: [job.company.user.id],
          notification: { title: 'New Job Application Received', body: 'New Job Application Received' },
          dataPayload: { applicationId: applicationResult?.id.toString(), fromUserId: senderId, deepLink },
          senderId,
          metadata: {
            applicationId: applicationResult.id,
            jobId: dto.jobId,
            fromUserId: senderId,
            candidateId: dto.candidateId,
          },
          type: NotificationTypes.JOB_APPLICATION,
        };

        // Email the company. Prefer the account owner's login email (the inbox they
        // actually monitor) and fall back to the company profile email. Decoupled from
        // the notification so a missing/failed email never blocks the in-app alert.
        const companyEmail = job.company?.user?.email || job.company?.email;
        if (companyEmail) {
          this.emailService
            .send({
              to: companyEmail,
              subject: 'New Job Application Received',
              html: this._buildApplicationEmail({ job, filledPositions, totalPositions, applicationUrl }),
            })
            .catch((err) => {
              this.logger.warn(
                `[create] Company application email failed for application ${applicationResult.id}: ${err?.message ?? err}`,
              );
            });
        }

        await this.notificationProvider.sendNotifications(params);
      }

      this.sendApplicationSubmittedEmail(applicationResult.id).catch((err) => {
        this.logger.warn(
          `[create] Application Submitted email failed for application ${applicationResult.id}: ${err?.message ?? err}`,
        );
      });

      this.sendAdminApplicationNotification(applicationResult.id).catch((err) => {
        this.logger.warn(
          `[create] Admin notification email failed for application ${applicationResult.id}: ${err?.message ?? err}`,
        );
      });

      return applicationResult;
    } catch (error) {
      handleDBError(error);
    }
  }

  private async sendApplicationSubmittedEmail(applicationId: number) {
    const application = await this.applicationRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.jobTitle', 'jobTitle')
      .leftJoinAndSelect('job.company', 'company')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('candidate.user', 'user')
      .addSelect(['user.email'])
      .addSelect(['job.hideCompanyName'])
      .where('application.id = :applicationId', { applicationId })
      .getOne();

    if (!application) {
      this.logger.warn(`[sendApplicationSubmittedEmail] Application ${applicationId} not found`);
      return;
    }

    const recipientEmail = application.candidate?.user?.email;
    if (!recipientEmail) {
      this.logger.warn(
        `[sendApplicationSubmittedEmail] No candidate email for application ${applicationId}`,
      );
      return;
    }

    const firstName = application.candidate?.firstName || 'there';
    const jobTitle = application.job?.jobTitle?.name || 'the position';
    const companyName = this.resolveCompanyName(application.job);

    const props = { firstName, jobTitle, companyName };
    const html = getApplicationSubmittedTemplate(props);
    const text = getApplicationSubmittedText(props);

    try {
      await this.emailService.send({
        to: recipientEmail,
        subject: `Application received — ${jobTitle} at ${companyName}`,
        html,
        text,
      });
      this.logger.log(
        `[sendApplicationSubmittedEmail] Sent to ${recipientEmail} (application ${applicationId})`,
      );
    } catch (err: any) {
      this.logger.error(
        `[sendApplicationSubmittedEmail] Failed for application ${applicationId}: ${err?.message ?? err}`,
      );
    }
  }

  private async sendAdminApplicationNotification(applicationId: number) {
    const application = await this.applicationRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.jobTitle', 'jobTitle')
      .leftJoinAndSelect('job.company', 'company')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('candidate.user', 'candidateUser')
      .leftJoinAndSelect('application.resume', 'resume')
      .addSelect(['candidateUser.email'])
      .where('application.id = :applicationId', { applicationId })
      .getOne();

    if (!application) {
      this.logger.warn(`[sendAdminApplicationNotification] Application ${applicationId} not found`);
      return;
    }

    const adminUsers = await this.userRepo.find({
      where: {
        role: UserRoles.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: ['id', 'email'],
    });

    const adminEmails = adminUsers
      .map((u) => u.email)
      .filter((email): email is string => !!email && email.includes('@'));

    if (adminEmails.length === 0) {
      this.logger.warn(
        `[sendAdminApplicationNotification] No active super admins found for application ${applicationId}`,
      );
      return;
    }

    const candidate = application.candidate;
    const candidateName = candidate
      ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown candidate'
      : 'Unknown candidate';
    const candidateEmail = candidate?.user?.email || 'Not provided';
    const candidatePhone =
      candidate?.countryCode || candidate?.phoneNumber
        ? `${candidate?.countryCode || ''} ${candidate?.phoneNumber || ''}`.trim()
        : undefined;

    const jobTitle = application.job?.jobTitle?.name || 'the position';
    const companyName =
      application.job?.company?.name ||
      application.job?.companyName ||
      'Seamfox';

    let attachments: any[] = [];
    let hasCv = false;

    const resume = application.resume;
    this.logger.log(
      `[ADMIN-NOTIF] App ${applicationId} — resumeId: ${(application as any).resumeId ?? 'NONE'}, resume loaded: ${!!resume}, filePath: ${resume?.filePath ?? 'NULL'}`,
    );

    if (resume?.filePath) {
      try {
        const filename = resume.filePath.split('/').pop() || 'resume.pdf';
        const fileUrl = buildS3Url(resume.filePath);

        this.logger.log(
          `[ADMIN-NOTIF] Primary resume — filePath: ${resume.filePath} -> buildS3Url: ${fileUrl}`,
        );

        attachments.push({
          filename,
          path: fileUrl,
        });
        hasCv = true;

        this.logger.log(
          `[ADMIN-NOTIF] CV attachment prepared: ${filename} (${fileUrl})`,
        );
      } catch (err: any) {
        this.logger.warn(
          `[ADMIN-NOTIF] Could not prepare CV attachment: ${err?.message ?? err}`,
        );
      }
    } else {
      this.logger.log(
        `[ADMIN-NOTIF] No primary resume filePath — trying fallback getAnyResume for candidate ${candidate?.id}`,
      );
      try {
        const latestResume = await this.resumeService.getAnyResume(candidate?.id || 0);
        this.logger.log(
          `[ADMIN-NOTIF] Fallback resume: ${!!latestResume}, filePath: ${latestResume?.filePath ?? 'NULL'}`,
        );
        if (latestResume?.filePath) {
          const filename = latestResume.filePath.split('/').pop() || 'resume.pdf';
          const fileUrl = buildS3Url(latestResume.filePath);

          this.logger.log(
            `[ADMIN-NOTIF] Fallback filePath: ${latestResume.filePath} -> buildS3Url: ${fileUrl}`,
          );

          attachments.push({
            filename,
            path: fileUrl,
          });
          hasCv = true;

          this.logger.log(
            `[ADMIN-NOTIF] Fallback CV attachment prepared: ${filename}`,
          );
        } else {
          this.logger.warn(
            `[ADMIN-NOTIF] No fallback resume found for candidate ${candidate?.id} — email will have NO CV`,
          );
        }
      } catch (err: any) {
        this.logger.warn(
          `[ADMIN-NOTIF] Could not fetch fallback resume: ${err?.message ?? err}`,
        );
      }
    }

    this.logger.log(
      `[ADMIN-NOTIF] Final attachments count: ${attachments.length}, hasCv: ${hasCv}`,
    );

    const props = {
      candidateName,
      candidateEmail,
      candidatePhone,
      jobTitle,
      companyName,
      jobId: application.jobId,
      applicationId: application.id,
      candidateCity: candidate?.city,
      candidateCountry: candidate?.country,
      yearsOfExperience: candidate?.yearOfExperience,
      hasCv,
    };

    const html = getAdminApplicationNotificationTemplate(props);
    const text = getAdminApplicationNotificationText(props);

    try {
      await this.emailService.send({
        to: adminEmails,
        subject: `New Application: ${candidateName} → ${jobTitle} at ${companyName}`,
        html,
        text,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      this.logger.log(
        `[sendAdminApplicationNotification] Sent to ${adminEmails.length} admin(s) for application ${applicationId} (CV attached: ${hasCv})`,
      );
    } catch (err: any) {
      this.logger.error(
        `[sendAdminApplicationNotification] Failed for application ${applicationId}: ${err?.message ?? err}`,
      );
    }
  }

  async createByCompany(dto: CreateApplicationDto, senderId: string): Promise<Application> {
    try {
      const job = await this.jobService.findOne(dto.jobId);
      if (!job || job.status !== JobStatus.OPENED)
        throw new NotFoundException(`No open job found against Job #${dto.jobId}`);

      const existing = await this.applicationRepo.findOne({
        where: { jobId: dto.jobId, candidateId: dto.candidateId },
      });
      if (existing) throw new BadRequestException('Candidate has already applied for this job');

      const resume = await this.resumeService.getAnyResume(dto.candidateId);
      if (!resume?.id)
        throw new BadRequestException(
          'CV not found. This candidate has not uploaded a CV yet, so they cannot be added.',
        );

      const candidate = await this.candidateService.findOne(dto.candidateId);
      if (!candidate?.user?.email)
        throw new BadRequestException('Candidate does not have a registered email.');

      const reviewListCol = await this.kanbanBoardService.ensureReviewListColumn(job.kanbanBoardId);

      const application = this.applicationRepo.create({
        ...dto,
        resumeId: resume?.id ?? null,
        kanbanBoardStatusId: reviewListCol.id,
      });
      const applicationResult = await this.applicationRepo.save(application);

      const frontendBaseUrl = 'http://staging-portal.seamfox.com/';
      const applicationUrl = `${frontendBaseUrl}/candidate/jobs/${dto.jobId}`;

      await this.emailService.send({
        to: candidate.user.email,
        subject: 'Job Application Shortlisted',
        html: this._buildShortlistedEmail({ job, applicationUrl }),
      });

      return applicationResult;
    } catch (error) {
      handleDBError(error);
    }
  }

  async shortlistCandidate(dto: ShortlistApplicationDto, senderId: string): Promise<Application> {
    try {
      const job = await this.jobService.findOne(dto.jobId);
      if (!job || job.status !== JobStatus.OPENED)
        throw new NotFoundException(`No open job found against Job #${dto.jobId}`);

      const existing = await this.applicationRepo.findOne({
        where: { jobId: dto.jobId, candidateId: dto.candidateId },
      });
      if (existing) throw new BadRequestException('Candidate is already in the kanban for this job');

      const candidate = await this.candidateService.findOne(dto.candidateId);
      if (!candidate?.user?.email)
        throw new BadRequestException('Candidate does not have a registered email.');

      const resume = await this.resumeService.getAnyResume(dto.candidateId);
      if (!resume?.id)
        throw new BadRequestException(
          'CV not found. This candidate has not uploaded a CV yet, so they cannot be shortlisted.',
        );

      const shortlistedCol = await this.kanbanBoardService.getShortlistedColumn(job.kanbanBoardId);

      const application = this.applicationRepo.create({
        jobId: dto.jobId,
        candidateId: dto.candidateId,
        resumeId: resume?.id ?? null,
        kanbanBoardStatusId: shortlistedCol.id,
      });
      const applicationResult = await this.applicationRepo.save(application);

      const frontendBaseUrl = 'http://staging-portal.seamfox.com/';
      const applicationUrl = `${frontendBaseUrl}/candidate/jobs/${dto.jobId}`;

      await this.emailService.send({
        to: candidate.user.email,
        subject: `You have been shortlisted for ${job.jobTitle?.name ?? 'a position'}`,
        html: this._buildShortlistedEmail({ job, applicationUrl }),
      });

      return applicationResult;
    } catch (error) {
      handleDBError(error);
    }
  }

  async findApplicationsByCompany(companyId: number, query: GetAllApplicationDto) {
    try {
      const { page = 1, limit = 100, sortBy = 'application.id', order = 'ASC', filters, search } = query;

      const qb = this.applicationRepo
        .createQueryBuilder('application')
        .leftJoinAndSelect('application.job', 'job')
        .innerJoin('job.company', 'company')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .leftJoinAndSelect('candidate.user', 'user')
        .addSelect(['user.email'])
        .leftJoinAndSelect('application.resume', 'resume')
        .leftJoinAndSelect('application.kanbanBoardStatus', 'status')
        .leftJoinAndSelect('job.jobTitle', 'jobTitle')
        .where('company.id = :companyId', { companyId });

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

  async findApplicationsByJob(jobId: number, query: GetAllApplicationDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'application.id', order = 'ASC', filters, search } = query;

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

  async findApplicationById(applicationId: number) {
    try {
      const application = await this.applicationRepo
        .createQueryBuilder('application')
        .leftJoinAndSelect('application.job', 'job')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .leftJoinAndSelect('candidate.user', 'user')
        .addSelect(['user.email'])
        .leftJoinAndSelect('application.resume', 'resume')
        .leftJoinAndSelect('application.kanbanBoardStatus', 'status')
        .leftJoinAndSelect('job.jobTitle', 'jobTitle')
        .leftJoinAndSelect('application.comments', 'comments')
        .where('application.id = :applicationId', { applicationId })
        .orderBy('comments.createdAt', 'DESC')
        .getOne();

      if (!application) throw new NotFoundException(`Application with ID ${applicationId} not found`);
      return application;
    } catch (error) {
      handleDBError(error);
    }
  }

  async findByCandidate(candidateId: number, query: GetAllApplicationDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'id', order = 'DESC', filters, search } = query;

      const qb = this.applicationRepo
        .createQueryBuilder('application')
        .leftJoinAndSelect('application.job', 'job')
        .leftJoinAndSelect('job.jobTitle', 'jobTitle')
        .leftJoinAndSelect('job.company', 'company')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .leftJoinAndSelect('application.kanbanBoardStatus', 'kanbanBoardStatus')
        .leftJoinAndSelect('kanbanBoardStatus.coreStatus', 'coreStatus')
        .where('application.candidateId = :candidateId', { candidateId })
        .andWhere(`(company.status = 'APPROVED' OR job.createdByType = 'admin')`);

      if (search) {
        qb.andWhere(
          `(LOWER(jobTitle.name) LIKE :search OR LOWER(company.name) LIKE :search OR LOWER(job.companyName) LIKE :search OR LOWER(job.country) LIKE :search OR LOWER(job.city) LIKE :search OR LOWER(job.department) LIKE :search)`,
          { search: `%${search.toLowerCase()}%` },
        );
      }
      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`application.${field} = :${field}`, { [field]: filters[field] });
        });
      }
      qb.orderBy(`application.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      qb.skip((+page - 1) * +limit).take(+limit);

      const [applications, total] = await qb.getManyAndCount();
      const data = applications.map((app) => ({
        ...app,
        statusId: app.kanbanBoardStatus?.coreStatus?.id ?? null,
        status: app.kanbanBoardStatus?.coreStatus?.name ?? null,
      }));

      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateStatus(id: number, dto: UpdateApplicationDto): Promise<Application> {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
        relations: [
          'kanbanBoardStatus',
          'kanbanBoardStatus.coreStatus',
          'job',
          'job.jobTitle',
          'job.company',
          'candidate',
          'candidate.user',
        ],
      });

      if (!application) throw new NotFoundException(`Application #${id} not found`);

      const kanbanBoardId = application.kanbanBoardStatus.kanbanBoardId;
      const kanbanBoard = await this.kanbanBoardService.getBoardById(kanbanBoardId);
      const newStatus = kanbanBoard.statuses.find((item) => item.id == dto.kanbanBoardStatusId);

      if (!newStatus)
        throw new BadRequestException('Status can only be updated on the same board where the job is posted');

      const isHired =
        newStatus.coreStatus?.name?.toLowerCase() === 'hired' ||
        newStatus.name?.toLowerCase() === 'hired';

      if (isHired) {
        const job = await this.jobRepo.findOne({ where: { id: application.jobId } });
        if (job) {
          const totalPositions = job.totalPositions ?? 1;
          const filledPositions = await this.applicationRepo
            .createQueryBuilder('app')
            .leftJoin('app.kanbanBoardStatus', 'kbs')
            .leftJoin('kbs.coreStatus', 'cs')
            .where('app.jobId = :jobId', { jobId: application.jobId })
            .andWhere("LOWER(cs.name) IN ('hired', 'successful')")
            .getCount();

          if (filledPositions >= totalPositions)
            throw new BadRequestException(`All ${totalPositions} position(s) for this role are already filled.`);

          application.kanbanBoardStatus = { id: dto.kanbanBoardStatusId } as any;
          const saved = await this.applicationRepo.save(application);

          if (filledPositions + 1 >= totalPositions && job.status !== JobStatus.CLOSED) {
            job.status = JobStatus.CLOSED;
            await this.jobRepo.save(job);
          }

          await this.sendStatusChangeEmail(
            application.id,
            newStatus.name,
            dto.emailMessage,
            dto.emailSubject,
          );

          return saved;
        }
      }

      application.kanbanBoardStatus = { id: dto.kanbanBoardStatusId } as any;
      const saved = await this.applicationRepo.save(application);

      await this.sendStatusChangeEmail(
        application.id,
        newStatus.name,
        dto.emailMessage,
        dto.emailSubject,
      );

      return saved;
    } catch (error) {
      handleDBError(error);
    }
  }

  private async sendStatusChangeEmail(
    applicationId: number,
    statusName: string,
    emailMessage?: string,
    emailSubject?: string,
  ) {
    try {
      /*
       * candidate.user.email aur company.user.email project mein select:false ho
       * sakte hain. Sirf relations ke saath findOne() karne se hidden columns
       * guaranteed load nahi hote, is liye explicit addSelect zaroori hai.
       */
      const application = await this.applicationRepo
        .createQueryBuilder('application')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .leftJoinAndSelect('candidate.user', 'candidateUser')
        .leftJoinAndSelect('application.job', 'job')
        .leftJoinAndSelect('job.jobTitle', 'jobTitle')
        .leftJoinAndSelect('job.company', 'company')
        .leftJoinAndSelect('company.user', 'companyUser')
        .addSelect([
          'candidateUser.email',
          'companyUser.email',
          'company.email',
        ])
        .where('application.id = :applicationId', { applicationId })
        .getOne();

      if (!application) {
        this.logger.warn(
          `[sendStatusChangeEmail] Application ${applicationId} not found`,
        );
        return;
      }

      const candidateEmail = application.candidate?.user?.email;

      const companyEmail =
        application.job?.company?.user?.email ||
        application.job?.company?.email;

      const candidateName =
        `${application.candidate?.firstName ?? ''} ${application.candidate?.lastName ?? ''
          }`.trim() || 'Candidate';

      const jobTitle =
        application.job?.jobTitle?.name || 'the position';

      const companyName =
        this.resolveCompanyName(application.job);

      const displayStatus =
        statusName.charAt(0).toUpperCase() +
        statusName.slice(1).toLowerCase();

      const frontendBaseUrl =
        process.env.FRONTEND_URL ||
        'http://staging-portal.seamfox.com';

      const applicationUrl =
        `${frontendBaseUrl.replace(/\/$/, '')}/member/applications`;

      /*
      ==========================
      Modal message resolution
      ==========================
      */

      const trimmedMessage = (emailMessage || '').trim();
      const trimmedSubject = (emailSubject || '').trim();

      const hasCustomMessage = trimmedMessage.length > 0;

      this.logger.log(
        `[sendStatusChangeEmail] application=${applicationId} candidateEmail=${candidateEmail ?? 'NONE'} companyEmail=${companyEmail ?? 'NONE'} source=${hasCustomMessage ? 'modal' : 'backend-default'}`,
      );

      const escapeHtml = (value: string): string =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const escapedCandidateName = escapeHtml(candidateName);
      const escapedJobTitle = escapeHtml(jobTitle);
      const escapedCompanyName = escapeHtml(companyName);
      const escapedDisplayStatus = escapeHtml(displayStatus);

      const customMessageHtml = escapeHtml(trimmedMessage)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n/g, '<br />');

      /*
      ==========================
      Candidate Email
      ==========================
      */

      if (candidateEmail) {
        const candidateSubject =
          trimmedSubject ||
          `Application Update — ${jobTitle} (${displayStatus})`;

        const candidateContentHtml = hasCustomMessage
          ? `
          <div
            style="
              color:#374151;
              font-size:15px;
              line-height:1.7;
              overflow-wrap:anywhere;
            "
          >
            ${customMessageHtml}
          </div>
        `
          : `
          <h2
            style="
              margin:0 0 22px;
              color:#022A45;
              font-size:22px;
              line-height:1.4;
            "
          >
            Hi ${escapedCandidateName},
          </h2>

          <p
            style="
              margin:0 0 20px;
              color:#374151;
              font-size:15px;
              line-height:1.6;
            "
          >
            Your application status has been updated.
          </p>

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              margin:20px 0;
              background:#fff8f4;
              border-left:4px solid #CD4E1A;
              border-radius:4px;
            "
          >
            <tr>
              <td style="padding:20px 24px;">
                <p
                  style="
                    margin:0;
                    color:#6b7280;
                    font-size:12px;
                    text-transform:uppercase;
                  "
                >
                  Position
                </p>

                <p
                  style="
                    margin:5px 0 15px;
                    color:#022A45;
                    font-size:15px;
                    font-weight:700;
                  "
                >
                  ${escapedJobTitle}
                </p>

                <p
                  style="
                    margin:0;
                    color:#6b7280;
                    font-size:12px;
                    text-transform:uppercase;
                  "
                >
                  Company
                </p>

                <p
                  style="
                    margin:5px 0 15px;
                    color:#022A45;
                    font-size:15px;
                    font-weight:700;
                  "
                >
                  ${escapedCompanyName}
                </p>

                <p
                  style="
                    margin:0;
                    color:#6b7280;
                    font-size:12px;
                    text-transform:uppercase;
                  "
                >
                  Current Stage
                </p>

                <p
                  style="
                    margin:5px 0 0;
                    color:#CD4E1A;
                    font-size:18px;
                    font-weight:700;
                  "
                >
                  ${escapedDisplayStatus}
                </p>
              </td>
            </tr>
          </table>
        `;

        const candidateText = hasCustomMessage
          ? trimmedMessage
          : `Hi ${candidateName},

Your application status for ${jobTitle} at ${companyName} has been updated.

Current Stage:
${displayStatus}

View your application:
${applicationUrl}

Seamfox`;

        const candidateHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f7fa;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      width:100%;
      padding:40px 20px;
      background:#f5f7fa;
    "
  >
    <tr>
      <td align="center">
        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width:100%;
            max-width:600px;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
          "
        >
          <tr>
            <td
              style="
                padding:32px;
                background:#022A45;
                text-align:center;
              "
            >
              <h1
                style="
                  margin:0;
                  color:#ffffff;
                  font-size:24px;
                "
              >
                Seamfox
              </h1>

              <p
                style="
                  margin:8px 0 0;
                  color:#FED9C2;
                  font-size:13px;
                  text-transform:uppercase;
                "
              >
                Application Update
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              ${candidateContentHtml}

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="margin-top:28px;"
              >
                <tr>
                  <td align="center">
                    <a
                      href="${applicationUrl}"
                      style="
                        display:inline-block;
                        padding:14px 30px;
                        background:#CD4E1A;
                        color:#ffffff;
                        border-radius:8px;
                        text-decoration:none;
                        font-size:15px;
                        font-weight:600;
                      "
                    >
                      View Application
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:15px;
                background:#022A45;
                text-align:center;
              "
            >
              <p
                style="
                  margin:0;
                  color:#FED9C2;
                  font-size:11px;
                "
              >
                © ${new Date().getFullYear()} Seamfox
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

        await this.emailService.send({
          to: candidateEmail,
          subject: candidateSubject,
          html: candidateHtml,
          text: candidateText,
        });

        this.logger.log(
          `[sendStatusChangeEmail] Candidate email sent to ${candidateEmail} using ${hasCustomMessage ? 'modal message' : 'backend default template'
          }`,
        );
      } else {
        this.logger.warn(
          `[sendStatusChangeEmail] Candidate email missing for application ${applicationId}`,
        );
      }

      /*
      ==========================
      Company Email
      ==========================
      */

      if (companyEmail) {
        const companyHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f7fa;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      width:100%;
      padding:40px 20px;
      background:#f5f7fa;
    "
  >
    <tr>
      <td align="center">
        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width:100%;
            max-width:600px;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
          "
        >
          <tr>
            <td
              style="
                padding:30px;
                background:#022A45;
                text-align:center;
              "
            >
              <h1
                style="
                  margin:0;
                  color:#ffffff;
                  font-size:24px;
                "
              >
                Seamfox
              </h1>

              <p
                style="
                  margin:8px 0 0;
                  color:#FED9C2;
                  font-size:13px;
                "
              >
                Candidate Status Updated
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h2
                style="
                  margin:0 0 20px;
                  color:#022A45;
                  font-size:22px;
                "
              >
                Hi ${escapedCompanyName},
              </h2>

              <p
                style="
                  margin:0 0 20px;
                  color:#374151;
                  font-size:15px;
                  line-height:1.6;
                "
              >
                A candidate application status has been updated on your hiring board.
              </p>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background:#fff8f4;
                  border-left:4px solid #CD4E1A;
                  border-radius:4px;
                "
              >
                <tr>
                  <td style="padding:20px 24px;">
                    <p
                      style="
                        margin:0 0 16px;
                        color:#374151;
                        font-size:14px;
                        line-height:1.5;
                      "
                    >
                      <strong>Candidate:</strong><br/>
                      ${escapedCandidateName}
                    </p>

                    <p
                      style="
                        margin:0 0 16px;
                        color:#374151;
                        font-size:14px;
                        line-height:1.5;
                      "
                    >
                      <strong>Position:</strong><br/>
                      ${escapedJobTitle}
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#374151;
                        font-size:14px;
                        line-height:1.5;
                      "
                    >
                      <strong>New Status:</strong><br/>

                      <span
                        style="
                          color:#CD4E1A;
                          font-weight:700;
                        "
                      >
                        ${escapedDisplayStatus}
                      </span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:15px;
                background:#022A45;
                text-align:center;
              "
            >
              <p
                style="
                  margin:0;
                  color:#FED9C2;
                  font-size:11px;
                "
              >
                © ${new Date().getFullYear()} Seamfox Recruitment Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

        await this.emailService.send({
          to: companyEmail,
          subject:
            `Candidate Status Updated — ${candidateName} (${displayStatus})`,
          html: companyHtml,
          text: `Hi ${companyName},

Candidate ${candidateName} status has been updated.

Position:
${jobTitle}

New Status:
${displayStatus}

Seamfox`,
        });

        this.logger.log(
          `[sendStatusChangeEmail] Company email sent to ${companyEmail}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `[sendStatusChangeEmail] Failed application=${applicationId}: ${err?.message ?? err
        }`,
        err?.stack,
      );
    }
  }




  async removeFromKanban(id: number) {
    try {
      const application = await this.applicationRepo.findOne({ where: { id } });
      if (!application) throw new NotFoundException(`Application #${id} not found`);
      await this.applicationRepo.softDelete({ id });
      return { ok: true };
    } catch (error) {
      handleDBError(error);
    }
  }

  async withdrawApplication(applicationId: number, candidateId: number) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId, candidateId },
        relations: ['kanbanBoardStatus', 'kanbanBoardStatus.coreStatus'],
      });
      if (!application)
        throw new NotFoundException('Application not found or does not belong to you');

      const coreName = application.kanbanBoardStatus?.coreStatus?.name?.toLowerCase();
      const isAppliedStage =
        coreName === 'applied' || application.kanbanBoardStatus?.order === 1;
      if (!isAppliedStage)
        throw new BadRequestException('You can only withdraw an application that is in the Applied stage.');

      await this.applicationRepo.softDelete({ id: applicationId, candidateId });

      this.notifyCompanyOnWithdraw(applicationId).catch((err) =>
        this.logger.warn(
          `[withdrawApplication] notify failed for application ${applicationId}: ${err?.message ?? err}`,
        ),
      );

      return { ok: true };
    } catch (error) {
      handleDBError(error);
    }
  }

  private async notifyCompanyOnWithdraw(applicationId: number) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
      withDeleted: true,
      relations: [
        'candidate',
        'candidate.user',
        'job',
        'job.jobTitle',
        'job.company',
        'job.company.user',
      ],
    });

    if (!application) return;

    const companyUserId = application.job?.company?.user?.id;

    const companyEmail =
      application.job?.company?.user?.email ||
      application.job?.company?.email;

    const candidateUserId = application.candidate?.user?.id;

    this.logger.log(
      `[withdrawApplication] app=${applicationId} jobId=${application.jobId} companyUserId=${companyUserId ?? 'NONE'} companyEmail=${companyEmail ?? 'NONE'}`,
    );

    const candidateName =
      `${application.candidate?.firstName ?? ''} ${application.candidate?.lastName ?? ''}`.trim() ||
      'A candidate';

    const jobTitle = application.job?.jobTitle?.name ?? 'a job';

    const companyName =
      application.job?.company?.name ?? 'there';

    const title = 'Application Withdrawn';

    const body = `${candidateName} withdrew their application for ${jobTitle}`;

    const withdrawnAt = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const frontendBaseUrl = 'http://staging-portal.seamfox.com/';

    const boardUrl =
      `${frontendBaseUrl}/company/applications?application-id=${application.jobId}`;


    const withdrawEmailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
</head>

<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 20px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">

<tr>
<td style="background:#022A45;padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;">
Seamfox
</h1>

<p style="margin:8px 0 0;color:#FED9C2;font-size:13px;font-weight:600;text-transform:uppercase;">
Application Withdrawn
</p>
</td>
</tr>


<tr>
<td style="padding:40px 40px 24px;">

<h2 style="margin:0 0 16px;color:#022A45;font-size:22px;font-weight:600;">
Hi ${companyName},
</h2>


<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
A candidate has withdrawn their application for one of your open roles.
</p>


<table width="100%" cellpadding="0" cellspacing="0"
style="margin:24px 0;background:#fff8f4;border-left:4px solid #CD4E1A;border-radius:6px;">

<tr>
<td style="padding:20px 24px;">


<p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;">
Candidate
</p>

<p style="margin:0 0 16px;color:#022A45;font-size:17px;font-weight:700;">
${candidateName}
</p>


<p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;">
Role
</p>

<p style="margin:0 0 16px;color:#022A45;font-size:15px;font-weight:600;">
${jobTitle}
</p>


<p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;">
Withdrawn on
</p>

<p style="margin:0;color:#374151;font-size:14px;">
${withdrawnAt}
</p>


</td>
</tr>

</table>


<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
This application has been removed from your hiring board. No action is required from you.
</p>


<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<a href="${boardUrl}"
style="display:inline-block;background:#CD4E1A;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
View Hiring Board
</a>

</td>
</tr>
</table>


</td>
</tr>


<tr>
<td style="border-top:1px solid #e4e8ed;padding:24px 40px;background:#fafbfc;">

<p style="margin:0 0 8px;color:#022A45;font-size:13px;font-weight:600;">
Need help?
</p>

<p style="margin:0;color:#6b7280;font-size:12px;">
Contact our support team at
<a href="mailto:support@seamfox.com"
style="color:#CD4E1A;text-decoration:none;font-weight:600;">
support@seamfox.com
</a>
</p>

</td>
</tr>


<tr>
<td style="background:#022A45;padding:16px 40px;text-align:center;">

<p style="margin:0;color:#FED9C2;font-size:11px;text-transform:uppercase;">
© ${new Date().getFullYear()} Seamfox · Commodity Talent Platform
</p>

</td>
</tr>


</table>

</td>
</tr>
</table>

</body>
</html>
`;


    let recipientIds: string[] = companyUserId
      ? [companyUserId]
      : [];

    let emailRecipients: string[] = companyEmail
      ? [companyEmail]
      : [];


    if (recipientIds.length === 0) {
      const admins =
        await this.userProvider.findAllByRole(UserRoles.SUPER_ADMIN);

      recipientIds = (admins || []).map((a) => a.id);

      emailRecipients = (admins || [])
        .map((a) => a.email)
        .filter(Boolean) as string[];

      this.logger.log(
        `[withdrawApplication] no company owner found, notifying admins`,
      );
    }


    if (recipientIds.length > 0) {
      await this.notificationProvider.sendNotifications({
        recipientIds,
        notification: {
          title,
          body,
        },
        dataPayload: {
          applicationId: String(applicationId),
          fromUserId: candidateUserId ?? '',
        },
        senderId: candidateUserId ?? recipientIds[0],
        metadata: {
          applicationId,
          jobId: application.jobId,
          candidateId: application.candidateId,
          fromUserId: candidateUserId,
          event: 'APPLICATION_WITHDRAWN',
        },
        type: NotificationTypes.JOB_APPLICATION,
      });
    }


    for (const to of emailRecipients) {
      await this.emailService.send({
        to,
        subject: `Application withdrawn — ${jobTitle}`,
        html: withdrawEmailHtml,
        text: `Seamfox

Application Withdrawn

Hi ${companyName},

A candidate has withdrawn their application for one of your open roles.

Candidate
${candidateName}

Role
${jobTitle}

Withdrawn on
${withdrawnAt}

This application has been removed from your hiring board. No action is required from you.

View Hiring Board

Need help?
Contact our support team at
support@seamfox.com

© ${new Date().getFullYear()} Seamfox · Commodity Talent Platform`,
      });
    }


    this.logger.log(
      `[withdrawApplication] app=${applicationId} notifications=${recipientIds.length} emails=${emailRecipients.length}`,
    );
  }


  async countAll(): Promise<number> {
    return this.applicationRepo.count();
  }

  async countPendingApplications(pendingIds: number[]) {
    return this.applicationRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.kanbanBoardStatus', 'boardStatus')
      .leftJoinAndSelect('boardStatus.coreStatus', 'coreStatus')
      .where(pendingIds.length > 0 ? 'boardStatus.jobCoreStatusId IN (:...pendingIds)' : '1=1', { pendingIds })
      .getCount();
  }

  async sendInterviewEmail(dto: SendInterviewEmailDto) {
    //  console.log('INTERVIEW DTO => ', JSON.stringify(dto, null, 2));
    this.logger.log(
      `[InterviewEmail] DTO: ${JSON.stringify(dto)}`
    );



    const trimmedMessage = (dto.message || '').trim();

    const finalMessage =
      trimmedMessage.length > 0
        ? trimmedMessage
        : this.buildDefaultInterviewMessage(dto.candidateName, dto.jobTitle);

    const candidateHtml = getInterviewInvitationTemplate({
      message: finalMessage,
    });

    const candidateText = getInterviewInvitationText({
      message: finalMessage,
    });


    await this.emailService.send({
      to: dto.candidateEmail,
      subject: dto.subject,
      html: candidateHtml,
      text: candidateText,
    });


    console.log('COMPANY EMAIL:', dto.companyEmail);


    if (dto.companyEmail && dto.companyEmail.includes('@')) {

      console.log('SENDING COMPANY EMAIL');


      const companyHtml = getInterviewScheduledTemplate({
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        jobTitle: dto.jobTitle,
      });

      const companyText = getInterviewScheduledText({
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        jobTitle: dto.jobTitle,
      });


      await this.emailService.send({
        to: dto.companyEmail,
        subject: `Interview Scheduled – ${dto.candidateName} for ${dto.jobTitle}`,
        html: companyHtml,
        text: companyText,
      });
    }
  }



  // Default interview invitation text — used when the modal message is left empty.
  private buildDefaultInterviewMessage(
    candidateName?: string,
    jobTitle?: string,
  ): string {
    const name = candidateName?.trim() || 'there';
    const role = jobTitle?.trim() || 'the position';
    return `Dear ${name},

We are pleased to invite you for an interview for the position of ${role}.

Please confirm your availability at your earliest convenience.

Best regards,
The Seamfox Team`;
  }

  private _buildApplicationEmail({
    job,
    filledPositions,
    totalPositions,
    applicationUrl,
  }: any) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
</head>

<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          
          <tr>
            <td style="padding:20px 24px;background:#022A45;color:#ffffff;">
              <h1 style="margin:0;font-size:20px;font-weight:600;">
                New Job Application Received
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;">
              
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#111827;">
                You have received a new job application.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f7ff;border:1px solid #d0e8ff;border-radius:8px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;">
                    Position
                  </td>
                  <td align="right" style="padding:6px 0;font-size:14px;font-weight:600;color:#022A45;">
                    ${job?.jobTitle?.name ?? "Role"}
                  </td>
                </tr>

                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;">
                    Positions Filled
                  </td>
                  <td align="right" style="padding:6px 0;font-size:14px;font-weight:600;color:#022A45;">
                    ${filledPositions + 1} / ${totalPositions}
                  </td>
                </tr>
              </table>

              <p style="text-align:center;margin:24px 0;">
                <a
                  href="${applicationUrl}"
                  style="display:inline-block;padding:12px 24px;background:#022A45;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;"
                >
                  View Application
                </a>
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                Sent via Seamfox Recruitment Platform
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }


  private _buildShortlistedEmail({ job, applicationUrl }: any) {
    const companyName = this.resolveCompanyName(job);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;background-color:#f4f4f4;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:20px 24px;background-color:#0f766e;color:#ffffff;"><h1 style="margin:0;font-size:20px;">You Are Shortlisted</h1></td></tr>
        <tr>
          <td style="padding:24px;color:#111827;font-size:14px;line-height:1.6;">
            <p style="margin:0 0 12px;">Congratulations! You have been <strong>shortlisted</strong> for:</p>
            <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f766e;">${job?.jobTitle?.name ?? 'Job Position'}</p>
            <p style="margin:0 0 16px;">Company: <strong>${companyName}</strong></p>
            <p style="text-align:center;margin:24px 0;"><a href="${applicationUrl}" style="display:inline-block;padding:10px 18px;background-color:#0f766e;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;">View Application</a></p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
            <p style="margin:0;font-size:11px;color:#9ca3af;">Sent by Seamfox Recruitment System</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }
}