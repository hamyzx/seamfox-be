import { UserRepository } from './../user/repository/user.repository';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { GetAllCompanyDto } from './dto/get-all-company.dto';
import { toLowerCaseFields } from '../lib/helpers/convertToLowercase';
import { handleDBError } from '../lib/error/dataBaseError';
import { KanbanBoardService } from './kanban-board/kanban-board.service';
import { CompanyStatusHistory } from '../company-status-history/entities/company-status-history.entity';
import { EmailService } from '../services/mail.service';
import { CompanyStatus } from '../lib/enums/company.enum';
import { UserProvider } from '../user/user.provider';
import { CompanySettings } from './entities/company-settings.entity';
import {
  getCompanyRegistrationCompleteTemplate,
  getCompanyRegistrationCompleteText,
  getCompanyProfileApprovedTemplate,
  getCompanyProfileApprovedText,
  getCompanyProfileRejectedTemplate,
  getCompanyProfileRejectedText,
  getCompanyProfileRejectedPermanentTemplate,
  getCompanyProfileRejectedPermanentText,
  getCompanyProfileStatusUpdateTemplate,
  getCompanyProfileStatusUpdateText,
} from '../lib/templates/company-onboarding-template'

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,

    @InjectRepository(CompanyStatusHistory)
    private companyStatusHistoryRepo: Repository<CompanyStatusHistory>,

    @InjectRepository(CompanySettings)
    private companySettingsRepo: Repository<CompanySettings>,

    private UserRepository: UserRepository,
    private readonly emailService: EmailService,
    private kanbanBoardService: KanbanBoardService,
    private UserService: UserProvider,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    try {
      console.log('[Company Mail] create() called for email:', (dto as any)?.email);
      const smallCaseDTO = toLowerCaseFields(dto);

      const rejectedCompany = await this.companyRepository.findOne({
        where: { email: smallCaseDTO.email },
      });

      if (rejectedCompany?.status === CompanyStatus.REJECTED && rejectedCompany.rejectedAt) {
        const cooldownEnd = new Date(rejectedCompany.rejectedAt);
        cooldownEnd.setDate(cooldownEnd.getDate() + 30);
        if (new Date() < cooldownEnd) {
          throw new ConflictException('Your company was rejected. You can reapply after 30 days.');
        }
      }

      const company = this.companyRepository.create(smallCaseDTO);
      const result = await this.companyRepository.save(company);

      await this.kanbanBoardService.createBoard({ name: 'Hiring Workflow', companyId: result.id });

      const companyName = result.name || 'there';

      const ownerUserId = (smallCaseDTO as any)?.userId || (result as any)?.userId;
      let loginEmail = result.email;
      if (ownerUserId) {
        const ownerUser = await this.UserService.findOne(ownerUserId);
        if (ownerUser?.email) loginEmail = ownerUser.email;
      }

      console.log('[Company Mail] registration -> attempting send to:', loginEmail, 'name:', companyName);
      await this.emailService
        .send({
          to: loginEmail,
          subject: 'Welcome to Seamfox — Registration Complete',
          html: getCompanyRegistrationCompleteTemplate({ companyName }),
          text: getCompanyRegistrationCompleteText({ companyName }),
        })
        .then(() => console.log('[Company Mail] registration -> send resolved OK for:', loginEmail))
        .catch((e) => console.log('[Company Mail] registration -> send FAILED:', e?.message, e));

      const superAdmins = await this.UserRepository.findSuperAdmins();
      for (const admin of superAdmins) {
        if (admin.email) {
          await this.emailService.send({
            to: admin.email,
            subject: 'New Company Registration',
            html: `<p>A new company has registered.</p><p><strong>Email:</strong> ${result.email}</p><p>Please review it from admin panel.</p>`,
          });
        }
      }

      return result;
    } catch (error) {
      handleDBError(error as any);
    }
  }

  async findAll(query: GetAllCompanyDto) {
    const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', filters, search, status } = query;
    const qb = this.companyRepository
      .createQueryBuilder('company')
      .withDeleted()
      .leftJoinAndSelect('company.user', 'user')
      .leftJoinAndSelect('company.industry', 'industry')
      .select([
        'company',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.role',
        'user.lastActive',
        'industry',
      ]);

    if (search) {
      qb.andWhere(
        '(LOWER(company.name) LIKE :search OR LOWER(company.email) LIKE :search OR company.phoneNumber LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }
    if (status?.trim()) {
      qb.andWhere('company.status = :status', { status: status.toUpperCase() });
    }
    if (filters) {
      Object.keys(filters).forEach((field) => {
        qb.andWhere(`company.${field} = :${field}`, { [field]: filters[field] });
      });
    }

    qb.orderBy(`company.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC')
      .skip((+page - 1) * +limit)
      .take(+limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: +page, limit: +limit };
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['user', 'industry'],
    });
    if (!company) throw new NotFoundException(`Company #${id} not found`);
    return company;
  }

  async update(id: number, dto: UpdateCompanyDto = {}, adminId?: string): Promise<Company> {
    const company = await this.companyRepository.findOne({ where: { id }, relations: ['user'] });
    if (!company) throw new NotFoundException('Company not found');

    const { comment, status, ...rest } = dto;
    if (Object.keys(rest).length > 0) await this.companyRepository.update(id, rest);

    const finalStatus = status ?? CompanyStatus.UNDER_REVIEW;
    if (finalStatus !== company.status) {
      await this.companyRepository.update(id, {
        status: finalStatus,
        changeRequestComment: finalStatus === CompanyStatus.REQUEST_CHANGE ? comment : null,
        rejectedAt: finalStatus === CompanyStatus.REJECTED ? new Date() : undefined,
      });

      const companyName = company.name || 'there';
      const isAdminStatusChange = !!status;
      let subject: string | null = null;
      let html: string | null = null;
      let text: string | null = null;

      if (finalStatus === CompanyStatus.APPROVED) {
        subject = 'Your Seamfox company profile is approved';
        html = getCompanyProfileApprovedTemplate({ companyName });
        text = getCompanyProfileApprovedText({ companyName });
      } else if (finalStatus === CompanyStatus.REQUEST_CHANGE) {
        subject = 'Action needed on your Seamfox company profile';
        html = getCompanyProfileRejectedTemplate({ companyName, rejectionReason: comment });
        text = getCompanyProfileRejectedText({ companyName, rejectionReason: comment });
      } else if (finalStatus === CompanyStatus.REJECTED) {
        subject = 'Update on your Seamfox application';
        html = getCompanyProfileRejectedPermanentTemplate({ companyName, rejectionReason: comment });
        text = getCompanyProfileRejectedPermanentText({ companyName, rejectionReason: comment });
      } else if (isAdminStatusChange) {
        const readableStatus = String(finalStatus).replace(/_/g, ' ').toLowerCase();
        subject = 'Update on your Seamfox company profile';
        html = getCompanyProfileStatusUpdateTemplate({
          companyName,
          statusLabel: readableStatus,
          note: comment,
        });
        text = getCompanyProfileStatusUpdateText({
          companyName,
          statusLabel: readableStatus,
          note: comment,
        });
      }

      if (subject && html) {
        console.log('[Company Mail] status', finalStatus, '-> attempting send to:', company.user.email);
        await this.emailService
          .send({ to: company.user.email, subject, html, text: text ?? undefined })
          .then(() => console.log('[Company Mail] status mail resolved OK for:', company.user.email))
          .catch((e) => console.log('[Company Mail] status mail FAILED:', e?.message, e));
      }

      const history = new CompanyStatusHistory();
      history.companyId = id;
      history.adminId = adminId ?? null;
      history.status = finalStatus;
      history.comment = comment ?? null;
      await this.companyStatusHistoryRepo.save(history);
    }

    const updatedCompany = await this.companyRepository.findOne({
      where: { id },
      relations: ['user', 'industry', 'statusHistory'],
    });
    if (!updatedCompany) throw new NotFoundException('Company not found after update');
    return updatedCompany;
  }

  async remove(id: number): Promise<void> {
    const result = await this.companyRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Company #${id} not found`);
  }

  async countAll(): Promise<number> {
    return this.companyRepository.count();
  }

  // ─── Settings ────────────────────────────────────────────────────────────────

  async getTemplates(userId: string) {
    const settings = await this.companySettingsRepo.findOne({ where: { userId } });
    return {
      interview: settings?.interviewTemplate ?? null,
      accepted: settings?.acceptedTemplate ?? null,
      rejected: settings?.rejectedTemplate ?? null,
    };
  }

  async saveTemplates(
    userId: string,
    templates: { interview?: string; accepted?: string; rejected?: string },
  ) {
    let settings = await this.companySettingsRepo.findOne({ where: { userId } });
    if (!settings) settings = this.companySettingsRepo.create({ userId });
    if (templates.interview !== undefined) settings.interviewTemplate = templates.interview;
    if (templates.accepted !== undefined) settings.acceptedTemplate = templates.accepted;
    if (templates.rejected !== undefined) settings.rejectedTemplate = templates.rejected;
    return this.companySettingsRepo.save(settings);
  }
}