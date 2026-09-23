import { Injectable } from '@nestjs/common';
import { CandidateService } from '../candidate/candidate.service';
import { CompanyService } from '../company/company.service';
import { KanbanBoardService } from '../company/kanban-board/kanban-board.service';
import { JobService } from '../job/job.service';
import { ApplicationService } from '../application/application.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { LoginActivityRepository } from '../auth/repository/login-activity.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(
    private readonly candidateService: CandidateService,
    private readonly companyService: CompanyService,
    private readonly jobService: JobService,
    private readonly kanbanBoardService: KanbanBoardService,
    private readonly applicationService: ApplicationService,
    private readonly subscriptionService: SubscriptionService,
    private readonly loginActivityRepository: LoginActivityRepository,
    private readonly dataSource: DataSource,
  ) {}

  async getDashboardData() {
    const coreStatus = await this.kanbanBoardService.getCoreStatus();
    const pendingStatus = coreStatus.filter((item) => item.order < 4).map((s) => s.id);

    const [
      totalCandidate,
      totalCompany,
      totalJob,
      totalApplicant,
      totalPendingRequest,
      totalActiveSubscription,
    ] = await Promise.all([
      this.candidateService.countAll(),
      this.companyService.countAll(),
      this.jobService.countAll(),
      this.applicationService.countAll(),
      this.applicationService.countPendingApplications(pendingStatus),
      this.subscriptionService.countActive(),
    ]);

    return {
      totalCandidate,
      totalCompany,
      totalJob,
      totalApplicant,
      totalPendingRequest,
      totalActiveSubscription,
    };
  }

  async getUserActivityChart(period, parsedLimit, userType) {
    return await this.loginActivityRepository.getUserActivityChart(period, parsedLimit, userType);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 WEEKLY TOP USERS — Calendar week (Thursday-to-Thursday)
  //
  // Auto-resets every Thursday 00:00 UTC (no cron needed)
  // Logic: Calculate last Thursday's 00:00 UTC, filter attempts since then
  //
  // Examples:
  //   - Friday May 1   → window starts Thursday April 30 00:00 UTC
  //   - Wednesday May 6 → window still starts April 30 (same week)
  //   - Thursday May 7 → window AUTO-SHIFTS to May 7 (new week, empty start)
  // ═══════════════════════════════════════════════════════════════════
  async getWeeklyTopUsers() {
    const result = await this.dataSource.query(`
      WITH 
      -- 🔥 Calculate last Thursday at 00:00 UTC dynamically
      week_start AS (
        SELECT
          CASE
            -- If today is Thursday or later in the week (Thu/Fri/Sat) → this Thursday
            WHEN EXTRACT(DOW FROM NOW() AT TIME ZONE 'UTC') >= 4 THEN
              DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') 
              - INTERVAL '1 day' * (EXTRACT(DOW FROM NOW() AT TIME ZONE 'UTC')::int - 4)
            -- If today is Sun/Mon/Tue/Wed → last Thursday (previous week)
            ELSE
              DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') 
              - INTERVAL '1 day' * (EXTRACT(DOW FROM NOW() AT TIME ZONE 'UTC')::int + 3)
          END AS thursday_start
      ),

      combined_points AS (
        -- Quiz
        SELECT "userId", "earnPoint", "startedAt" AS "createdAt"
        FROM quiz_attempts, week_start
        WHERE "startedAt" >= week_start.thursday_start

        UNION ALL

        -- Mystery
        SELECT "userId", "earnPoint", "startedAt" AS "createdAt"
        FROM mystery_attempts, week_start
        WHERE "startedAt" >= week_start.thursday_start

        UNION ALL

        -- Crossword
        SELECT "userId", "earnPoint", "createdAt"
        FROM "crosswordAttempt", week_start
        WHERE "createdAt" >= week_start.thursday_start
      ),

      -- 🔥 LIMIT TOP 20 BEST ATTEMPTS PER USER (anti-spam)
      ranked_points AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY "userId"
            ORDER BY "earnPoint" DESC
          ) as rn
        FROM combined_points
      )

      SELECT 
        u.id AS "userId",
        u."firstName",
        u."lastName",
        u."email",
        u."profileImg",
        u."role",

        COALESCE(SUM(rp."earnPoint"), 0) AS "totalPoints",

        jsonb_build_object(
          'id', c.id,
          'firstName', c."firstName",
          'lastName', c."lastName",
          'profileImage', c."profileImage"
        ) AS candidate,

        jsonb_build_object(
          'id', comp.id,
          'name', comp."name",
          'logo', comp."logo"
        ) AS company

      FROM ranked_points rp
      INNER JOIN "users" u ON u.id = rp."userId"
      LEFT JOIN "candidate" c ON c."userId" = u.id
      LEFT JOIN "company" comp ON comp."userId" = u.id

      WHERE rp.rn <= 20

      GROUP BY 
        u.id, u."firstName", u."lastName", u."email", 
        u."profileImg", u."role", 
        c.id, comp.id

      ORDER BY "totalPoints" DESC
      LIMIT 5;
    `);

    return result.map((item) => ({
      userId: item.userId,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      profileImg: item.profileImg,
      role: item.role,
      totalPoints: Number(item.totalPoints) || 0,

      ...(item.role === 'CANDIDATE'
        ? { candidate: item.candidate, company: null }
        : { company: item.company, candidate: null }),
    }));
  }
}