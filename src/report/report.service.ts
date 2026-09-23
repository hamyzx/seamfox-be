import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UserProvider } from '../user/user.provider';
import { UserStatus } from '../lib/enums/user.enum';
import { handleDBError } from '../lib/error/dataBaseError';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    private readonly userProvider: UserProvider,
  ) {}

  async create(reporterId: string, dto: CreateReportDto): Promise<Report> {
    try {
      const existing = await this.reportRepo.findOne({
        where: { reporterId, candidateId: dto.candidateId },
      });

      if (existing) {
        throw new BadRequestException('You have already reported this candidate');
      }

      const report = this.reportRepo.create({ ...dto, reporterId });
      return await this.reportRepo.save(report);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAll(page = 1, limit = 10, status?: ReportStatus) {
    try {
      const qb = this.reportRepo
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.reporter', 'reporter')
        .leftJoinAndSelect('report.candidate', 'candidate')
        .leftJoinAndSelect('candidate.user', 'candidateUser')
        .orderBy('report.createdAt', 'DESC');

      if (status) {
        qb.andWhere('report.status = :status', { status });
      }

      qb.skip((+page - 1) * +limit).take(+limit);

      const [data, total] = await qb.getManyAndCount();
      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }

  async findOne(id: number): Promise<Report> {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['reporter', 'candidate', 'candidate.user'],
    });
    if (!report) throw new NotFoundException(`Report #${id} not found`);
    return report;
  }

  async updateStatus(id: number, dto: UpdateReportDto): Promise<Report> {
    try {
      const report = await this.findOne(id);
      Object.assign(report, dto);
      return await this.reportRepo.save(report);
    } catch (error) {
      handleDBError(error);
    }
  }

  // ── Ban candidate's user account ──────────────────────────────────────────
  async banCandidate(reportId: number, adminNote?: string): Promise<{ ok: boolean }> {
    try {
      const report = await this.reportRepo.findOne({
        where: { id: reportId },
        relations: ['candidate', 'candidate.user'],
      });
      if (!report) throw new NotFoundException(`Report #${reportId} not found`);

      const userId = report.candidate?.user?.id;
      if (!userId) throw new BadRequestException('Candidate user not found');

      await this.userProvider.patchUser(userId, { status: UserStatus.BAN as any });

      report.status = ReportStatus.ACTION_TAKEN;
      if (adminNote) report.adminNote = adminNote;
      await this.reportRepo.save(report);

      return { ok: true };
    } catch (error) {
      handleDBError(error);
    }
  }

  // ── Unban candidate's user account ────────────────────────────────────────
  async unbanCandidate(candidateUserId: string): Promise<{ ok: boolean }> {
    try {
      await this.userProvider.patchUser(candidateUserId, { status: UserStatus.ACTIVE as any });
      return { ok: true };
    } catch (error) {
      handleDBError(error);
    }
  }

  async getReportsByCandidate(candidateId: number) {
    return this.reportRepo.find({
      where: { candidateId },
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
    });
  }
}