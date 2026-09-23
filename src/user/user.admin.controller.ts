import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles, UserStatus } from '../lib/enums/user.enum';
import { UserProvider } from './user.provider';
import { IResponse } from '../lib/interfaces/response.interface';
import { GetAllUserDTO } from './dto/getAllUser.dto';
import { PaginationDTO } from '../lib/dto/pagination.dto';
import { Request } from 'express';

@Controller('admin/user')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRoles.SUPER_ADMIN)
export class UserAdminController {
  constructor(private readonly userProvider: UserProvider) { }
  @Get('subscription')
  async findAllUsersSubscription(@Query() qParams: PaginationDTO): Promise<IResponse> {
    const data = await this.userProvider.findAllUserSubscriptions(qParams);
    return { data };
  }

  @Get('dashboard-stats')
  async getDashboardStats(): Promise<IResponse> {
    const data = await this.userProvider.getDashboardStats();
    return { data };
  }

  @Post('offline')
  @Roles(
    UserRoles.CANDIDATE,
    UserRoles.COMPANY,
    UserRoles.MODERATOR,
    UserRoles.SUPER_ADMIN,
  )
  async markOffline(@Req() req: Request): Promise<IResponse> {
    const data = await this.userProvider.markUserOffline(req.user.id);
    return { data, message: 'User marked offline' };
  }

  @Get()
  async findAll(@Query() qParams: GetAllUserDTO): Promise<IResponse> {
    const data = await this.userProvider.findAllAsAdmin(qParams);
    return { data };
  }

  @Get('activity')
  async findUserActivity(
    @Query() qParams: { page?: number; limit?: number; search?: string; type?: 'MEMBER' | 'COMPANY' },
  ): Promise<IResponse> {
    const data = await this.userProvider.findUserActivity(qParams);
    return { data };
  }


  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IResponse> {
    const data = await this.userProvider.findOneAsAdmin(id);
    return { data };
  }

  @Patch(':id')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: UserStatus; reason?: string },
  ): Promise<IResponse> {
    const data = await this.userProvider.updateUserStatusByAdmin(id, body.status, body.reason);
    return { data };
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string): Promise<IResponse> {
    const message = await this.userProvider.deleteUser(id, req.user.id);
    return { message };
  }

  @Put(':id/status')
  async toggleUserStatus(@Param('id') id: string) {
    const data = await this.userProvider.toggleUserStatus(id);
    return { data };
  }


}