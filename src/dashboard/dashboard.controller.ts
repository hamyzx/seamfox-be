import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(UserRoles.SUPER_ADMIN)
  async getDashboard() {
    const data = await this.dashboardService.getDashboardData();
    return { data };
  }

  @Get('userStats')
  @Roles(UserRoles.SUPER_ADMIN)
  async getUserActivityChart(
    @Query('period') period: 'daily' | 'weekly' | 'monthly',
    @Query('limit') limit = 7,
    @Query('userType') userType?: UserRoles,
  ) {
    const parsedLimit = Number(limit);

    const data = await this.dashboardService.getUserActivityChart(period, parsedLimit, userType);

    return { data };
  }

  @Get('topTrailBlazers')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR, UserRoles.CANDIDATE, UserRoles.COMPANY)
  async getTopTrailBlazers() {
    const data = await this.dashboardService.getWeeklyTopUsers();
    return { data };
  }
}
