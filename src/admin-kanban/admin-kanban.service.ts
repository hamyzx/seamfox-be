import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../job/entities/job.entity';
import { Application } from '../application/entities/application.entity';
import { UpdateApplicationDto } from '../application/dto/update-application.dto';
import { GetAllApplicationDto } from '../application/dto/get-all-application.dto';
import { KanbanBoardService } from '../company/kanban-board/kanban-board.service';
import { CreateKanbanColumnDto } from '../company/kanban-board/dto/create-kanban-column.dto';
import { UpdateKanbanColumnDto } from '../company/kanban-board/dto/update-kanban-column.dto';
import { ApplicationCommentService } from '../application-comment/application-comment.service';
import { EmailService } from '../services/mail.service';
import { handleDBError } from '../lib/error/dataBaseError';
import {
  getShortlistedTemplate,
  getShortlistedText,
  getHiredTemplate,
  getHiredText,
  getApplicationClosedTemplate,
  getApplicationClosedText,
  getEmployerMessageTemplate,
  getEmployerMessageText,
} from '../lib/templates/jobs.template';

@Injectable()
export class AdminKanbanService {
  private readonly logger = new Logger(AdminKanbanService.name);

  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
    @InjectRepository(Application)
    private applicationRepo: Repository<Application>,
    private readonly kanbanBoardService: KanbanBoardService,
    private readonly applicationCommentService: ApplicationCommentService,
    private readonly emailService: EmailService,
  ) {}

  async getAdminKanbanBoard(jobId: number) {
    try {
      const job = await this.jobRepo.findOne({
        where: { id: jobId, createdByType: 'admin' },
      });

      if (!job) {
        throw new NotFoundException(`Admin job #${jobId} not found`);
      }

      const kanbanBoard = await this.kanbanBoardService.getBoardById(job.kanbanBoardId);
      return kanbanBoard;
    } catch (error) {
      handleDBError(error);
    }
  }

  async getAdminJobApplications(jobId: number, query: GetAllApplicationDto) {
    try {
      const { page = 1, limit = 100, sortBy = 'application.id', order = 'ASC', filters, search } = query;

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

  async updateApplicationStatus(id: number, dto: UpdateApplicationDto) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id },
        relations: ['job', 'kanbanBoardStatus'],
      });

      if (!application) {
        throw new NotFoundException(`Application #${id} not found`);
      }

      if (application.job.createdByType !== 'admin') {
        throw new NotFoundException('This application does not belong to an admin job');
      }

      application.kanbanBoardStatus = { id: dto.kanbanBoardStatusId } as any;
      const saved = await this.applicationRepo.save(application);

      this.logger.log(
        `[updateApplicationStatus] Application ${id} moved to status ${dto.kanbanBoardStatusId}. Evaluating auto email (interview is skipped, handled by modal).`,
      );

      this.sendStatusChangeEmail(saved.id, dto.kanbanBoardStatusId).catch((err) => {
        this.logger.warn(
          `[updateApplicationStatus] Email trigger failed for application ${saved.id}: ${err?.message ?? err}`,
        );
      });

      return saved;
    } catch (error) {
      handleDBError(error);
    }
  }

  async addApplicationComment(applicationId: number, comment: string, userId: string) {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id: applicationId },
        relations: ['job'],
      });

      if (!application) {
        throw new NotFoundException(`Application #${applicationId} not found`);
      }

      if (application.job.createdByType !== 'admin') {
        throw new NotFoundException('This application does not belong to an admin job');
      }

      const result = await this.applicationCommentService.addComment(
        applicationId,
        comment,
        parseInt(userId),
      );

      this.sendEmployerMessageEmail(applicationId).catch((err) => {
        this.logger.warn(
          `[addApplicationComment] Email trigger failed for application ${applicationId}: ${err?.message ?? err}`,
        );
      });

      return result;
    } catch (error) {
      handleDBError(error);
    }
  }

  private async assertAdminBoard(kanbanBoardId: number) {
    const job = await this.jobRepo.findOne({
      where: { kanbanBoardId, createdByType: 'admin' },
    });
    if (!job) {
      throw new NotFoundException('Admin board not found for this kanban board');
    }
    return job;
  }

  async addColumn(dto: CreateKanbanColumnDto) {
    try {
      await this.assertAdminBoard(dto.kanbanBoardId);
      this.logger.log(
        `[addColumn] Adding column "${dto.name}" at order ${dto.order} to board ${dto.kanbanBoardId}.`,
      );
      return await this.kanbanBoardService.addColumn(dto);
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateColumn(id: number, dto: UpdateKanbanColumnDto) {
    try {
      this.logger.log(
        `[updateColumn] Updating column ${id} (name=${dto.name ?? '-'}, order=${dto.order ?? '-'}).`,
      );
      return await this.kanbanBoardService.updateColumn(id, dto);
    } catch (error) {
      handleDBError(error);
    }
  }

  async deleteColumn(id: number) {
    try {
      this.logger.log(`[deleteColumn] Deleting column ${id}.`);
      return await this.kanbanBoardService.deleteStatusColumn(id);
    } catch (error) {
      handleDBError(error);
    }
  }

  async getCoreStatus() {
    try {
      return await this.kanbanBoardService.getCoreStatus();
    } catch (error) {
      handleDBError(error);
    }
  }

  private async sendStatusChangeEmail(applicationId: number, kanbanBoardStatusId: number) {
    const application = await this.applicationRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.jobTitle', 'jobTitle')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('candidate.user', 'user')
      .addSelect(['user.email'])
      .leftJoinAndSelect('application.kanbanBoardStatus', 'status')
      .leftJoinAndSelect('status.coreStatus', 'coreStatus')
      .where('application.id = :applicationId', { applicationId })
      .getOne();

    if (!application) {
      this.logger.warn(`[sendStatusChangeEmail] Application ${applicationId} not found`);
      return;
    }

    const recipientEmail = application.candidate?.user?.email;
    if (!recipientEmail) {
      this.logger.warn(
        `[sendStatusChangeEmail] No candidate email for application ${applicationId}`,
      );
      return;
    }

    const firstName = application.candidate?.firstName || 'there';
    const jobTitle = application.job?.jobTitle?.name || 'the position';
    const companyName = application.job?.hideCompanyName
      ? 'Seamfox'
      : application.job?.companyName || 'Seamfox';

    const rawStatusName =
      (application.kanbanBoardStatus as any)?.name ||
      application.kanbanBoardStatus?.coreStatus?.name ||
      '';
    const statusName = String(rawStatusName).toLowerCase().trim();

    if (statusName.includes('interview')) {
      this.logger.log(
        `[sendStatusChangeEmail] Status "${rawStatusName}" is interview — auto email skipped (modal handles it).`,
      );
      return;
    }

    const templateConfig = this.resolveTemplateFromStatus(statusName);
    if (!templateConfig) {
      this.logger.log(
        `[sendStatusChangeEmail] No email template mapped for status "${rawStatusName}" (application ${applicationId})`,
      );
      return;
    }

    const props = { firstName, jobTitle, companyName };
    const html = templateConfig.html(props);
    const text = templateConfig.text(props);

    try {
      await this.emailService.send({
        to: recipientEmail,
        subject: templateConfig.subject(jobTitle, companyName),
        html,
        text,
      });
      this.logger.log(
        `[sendStatusChangeEmail] Sent "${templateConfig.label}" to ${recipientEmail} (application ${applicationId})`,
      );
    } catch (err: any) {
      this.logger.error(
        `[sendStatusChangeEmail] Failed to send for application ${applicationId}: ${err?.message ?? err}`,
      );
    }
  }

  private resolveTemplateFromStatus(statusName: string): {
    label: string;
    html: (p: { firstName: string; jobTitle: string; companyName: string }) => string;
    text: (p: { firstName: string; jobTitle: string; companyName: string }) => string;
    subject: (jobTitle: string, companyName: string) => string;
  } | null {
    if (!statusName) return null;

    if (statusName.includes('shortlist')) {
      return {
        label: 'Shortlisted',
        html: getShortlistedTemplate,
        text: getShortlistedText,
        subject: (jobTitle, companyName) =>
          `You've been shortlisted for ${jobTitle} at ${companyName}`,
      };
    }

    if (
      statusName.includes('hire') ||
      statusName.includes('hired') ||
      statusName.includes('success') ||
      statusName.includes('offer')
    ) {
      return {
        label: 'Hired',
        html: getHiredTemplate,
        text: getHiredText,
        subject: (jobTitle, companyName) =>
          `🎉 You're hired — ${jobTitle} at ${companyName}`,
      };
    }

    if (
      statusName.includes('reject') ||
      statusName.includes('closed') ||
      statusName.includes('not selected') ||
      statusName.includes('unsuccessful') ||
      statusName.includes('declin')
    ) {
      return {
        label: 'Application Closed',
        html: getApplicationClosedTemplate,
        text: getApplicationClosedText,
        subject: (jobTitle, companyName) =>
          `Application update — ${jobTitle} at ${companyName}`,
      };
    }

    return null;
  }

  private async sendEmployerMessageEmail(applicationId: number) {
    const application = await this.applicationRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('candidate.user', 'user')
      .addSelect(['user.email'])
      .where('application.id = :applicationId', { applicationId })
      .getOne();

    if (!application) {
      this.logger.warn(`[sendEmployerMessageEmail] Application ${applicationId} not found`);
      return;
    }

    const recipientEmail = application.candidate?.user?.email;
    if (!recipientEmail) {
      this.logger.warn(
        `[sendEmployerMessageEmail] No candidate email for application ${applicationId}`,
      );
      return;
    }

    const firstName = application.candidate?.firstName || 'there';
    const companyName = application.job?.hideCompanyName
      ? 'Seamfox'
      : application.job?.companyName || 'Seamfox';

    const html = getEmployerMessageTemplate({ firstName, companyName });
    const text = getEmployerMessageText({ firstName, companyName });

    try {
      await this.emailService.send({
        to: recipientEmail,
        subject: companyName
          ? `New message from ${companyName} on Seamfox`
          : 'You have a new message on Seamfox',
        html,
        text,
      });
      this.logger.log(
        `[sendEmployerMessageEmail] Sent to ${recipientEmail} (application ${applicationId})`,
      );
    } catch (err: any) {
      this.logger.error(
        `[sendEmployerMessageEmail] Failed for application ${applicationId}: ${err?.message ?? err}`,
      );
    }
  }
}