import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginActivity } from '../entities/login-activity.entity';
import { User } from '../../user/entities/user.entity';
import { UserRoles } from '../../lib/enums/user.enum';
import { CandidateService } from '../../candidate/candidate.service';
import { CompanyService } from '../../company/company.service';

@Injectable()
export class LoginActivityRepository {
  constructor(
    @InjectRepository(LoginActivity)
    private loginActivityRepository: Repository<LoginActivity>,
    private candidateService: CandidateService,
    private companyService: CompanyService,
  ) {}

  async createLog(user: User): Promise<void> {
    const obj = {
      userId: user.id,
      userType: user.role,
    };
    const log = this.loginActivityRepository.create(obj);
    this.loginActivityRepository.save(log);
  }

  async getUserActivityChart(
    period: 'daily' | 'weekly' | 'monthly',
    limit: number,
    userType?: UserRoles,
  ): Promise<any> {
    const qb = this.loginActivityRepository.createQueryBuilder('activity');

    qb.select([
      userType ? `'${userType}' as "userType"` : 'activity.userType',
      'activity.userId',
      `CASE 
        WHEN :period = 'daily' THEN TO_CHAR(activity.loginAt, 'YYYY-MM-DD')
        WHEN :period = 'weekly' THEN TO_CHAR(DATE_TRUNC('week', activity.loginAt), '"Week "IW')
        WHEN :period = 'monthly' THEN TO_CHAR(activity.loginAt, 'Mon YYYY')
      END as bucket`,
    ]).setParameter('period', period);

    if (userType) {
      qb.andWhere('activity.userType = :userType', { userType });
    }

    qb.groupBy('bucket, activity.userId, activity.userType')
      .orderBy('MIN(activity.loginAt)', 'DESC')
      .limit(limit * 100); // to avoid overfetching before grouping

    const raw = await qb.getRawMany();

    // Transform into ApexCharts format
    const grouped: Record<string, { active: Set<string>; inactive: number }> = {};

    raw.forEach((row) => {
      const bucket = row.bucket;
      if (!grouped[bucket]) grouped[bucket] = { active: new Set<string>(), inactive: 0 };
      grouped[bucket].active.add(row.userId);
    });

    // Now count total users from DB
    let totalUsers = 0;
    if (userType === UserRoles.CANDIDATE) {
      totalUsers = await this.candidateService.countAll();
    } else if (userType === UserRoles.COMPANY) {
      totalUsers = await this.companyService.countAll();
    } else {
      const [c, comp] = await Promise.all([
        this.candidateService.countAll(),
        this.companyService.countAll(),
      ]);
      totalUsers = c + comp;
    }

    // Convert into ApexCharts response
    const series = [
      {
        name: 'Active Users',
        data: Object.keys(grouped).map((bucket) => ({
          x: bucket,
          y: grouped[bucket].active.size,
        })),
      },
      {
        name: 'Inactive Users',
        data: Object.keys(grouped).map((bucket) => ({
          x: bucket,
          y: totalUsers - grouped[bucket].active.size,
        })),
      },
    ];

    return { series };
  }
}
