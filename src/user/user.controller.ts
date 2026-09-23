import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../lib/guards/auth.guard';
import { IResponse } from '../lib/interfaces/response.interface';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { GetAllDto } from './dto/get-all.dto';
import { UpdatePasswordDTO } from './dto/updatePassword.dto';
import { PaginationDTO } from '../lib/dto/pagination.dto';
import { RequestStatus } from '../lib/enums/request.enum';
import { UserProvider } from './user.provider';
import { UserRoles } from '../lib/enums/user.enum';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';

@Controller('user')
@UseGuards(AuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userProvider: UserProvider) {}

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 STATIC ROUTES — must come BEFORE any @Get(':id') / @Patch(':id')
  // Otherwise NestJS treats "marketing-consent" as a UUID and crashes
  // ═══════════════════════════════════════════════════════════════════

  @Get('marketing-consent')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async getMarketingConsent(@Req() req: Request) {
    const data = await this.userProvider.getMarketingConsent(req.user.id);
    return { data, status: true };
  }

  @Patch('marketing-consent')
  @Roles(UserRoles.CANDIDATE, UserRoles.COMPANY)
  async updateMarketingConsent(
    @Body() body: { optIn: boolean },
    @Req() req: Request,
  ) {
    const data = await this.userProvider.updateMarketingConsent(
      req.user.id,
      body.optIn,
    );
    return {
      data,
      status: true,
      message: body.optIn
        ? 'Subscribed to newsletter'
        : 'Unsubscribed from newsletter',
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // FRIEND / FOLLOW REQUESTS
  // ═══════════════════════════════════════════════════════════════════

  @Post('request/friend/:id')
  async toggleFriendRequest(
    @Req() req: Request,
    @Param('id') targetUserId: string,
  ): Promise<IResponse> {
    const message = await this.userProvider.toggleFriendRequest(req.user.id, targetUserId);
    return { message };
  }

  @Post('follow/:id')
  async toggleFollow(
    @Req() req: Request,
    @Param('id') targetUserId: string,
  ): Promise<IResponse> {
    const message = await this.userProvider.toggleFollow(req.user.id, targetUserId);
    return { message };
  }

  @Post('request/follow/:id')
  async toggleFollowRequest(
    @Req() req: Request,
    @Param('id') targetUserId: string,
  ): Promise<IResponse> {
    const message = await this.userProvider.toggleFollowRequest(req.user.id, targetUserId);
    return { message };
  }

  @Post('request/friend/response/:id')
  async friendRequestResponse(
    @Param('id') requestId: string,
    @Query('response', new ParseEnumPipe(RequestStatus)) response: RequestStatus,
  ): Promise<IResponse> {
    const message = await this.userProvider.friendRequestResponse(requestId, response);
    return { message };
  }

  @Post('request/follow/response/:id')
  async followRequestResponse(
    @Param('id') requestId: string,
    @Query('response', new ParseEnumPipe(RequestStatus)) response: RequestStatus,
  ): Promise<IResponse> {
    const message = await this.userProvider.followRequestResponse(requestId, response);
    return { message };
  }

  @Get('all')
  async findAll(@Query() query: GetAllDto) {
    const data = await this.userProvider.findAllUsers(query);
    return { data, message: 'Data Fetched successfully' };
  }

  @Post()
  @Roles(UserRoles.SUPER_ADMIN)
  async createUser(@Body() dto: CreateUserDto, @Req() req: Request) {
    // dto.updatedBy = req.user.id;
    const data = await this.userProvider.createUser(dto);
    return { data, message: 'Data Updated successfully' };
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    dto.updatedBy = req.user.id;
    const data = await this.userProvider.patchUser(id, dto);
    return { data, message: 'Data Updated successfully' };
  }

  @Get('requests')
  async findRequests(@Req() req: Request, @Query() qParams: PaginationDTO): Promise<IResponse> {
    const data = await this.userProvider.findRequests(req.user.id, qParams);
    return { data };
  }

  @Get('requests/friend')
  async findFriendRequests(
    @Req() req: Request,
    @Query() qParams: PaginationDTO,
  ): Promise<IResponse> {
    const data = await this.userProvider.findFriendRequests(req.user.id, qParams);
    return { data };
  }

  @Get('requests/follow')
  async findFollowRequests(
    @Req() req: Request,
    @Query() qParams: PaginationDTO,
  ): Promise<IResponse> {
    const data = await this.userProvider.findFollowRequests(req.user.id, qParams);
    return { data };
  }

  // FRIENDS & FOLLOWERS
  @Get(':id/friends')
  async findUserFriends(
    @Param('id') id: string,
    @Query() qParams: PaginationDTO,
  ): Promise<IResponse> {
    const data = await this.userProvider.findUserFriends(id, qParams);
    return { data };
  }

  @Get(':id/followers')
  async findUserFollowers(
    @Param('id') id: string,
    @Query() qParams: PaginationDTO,
  ): Promise<IResponse> {
    const data = await this.userProvider.findUserFollowers(id, qParams);
    return { data };
  }

  @Post('friend/:id')
  async removeFriend(@Req() req: Request, @Param('id') friendId: string): Promise<IResponse> {
    const data = await this.userProvider.removeFriend(req.user.id, friendId);
    return { data };
  }

  @Post('follower/:id')
  async removeFollower(@Req() req: Request, @Param('id') followerId: string): Promise<IResponse> {
    const data = await this.userProvider.removeFollower(req.user.id, followerId);
    return { data };
  }

  // PROFILE MANAGEMENT
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<IResponse> {
    const data = await this.userProvider.findUserProfile(id, req.user.id);
    return { data };
  }

  @Put()
  async updateProfile(@Body() payload: UpdateUserDto, @Req() req: Request): Promise<IResponse> {
    const data = await this.userProvider.updateUser(req.user.id, payload);
    return { data, message: 'Profile updated successfully' };
  }

  @Put(':id/subscription')
  async updateUserSubscriptionStatus(@Param('id') id: string): Promise<IResponse> {
    const data = await this.userProvider.updateUserSubscriptionStatus(id);
    return { data, message: 'Subscription status updated successfully' };
  }

  @Put('update-password')
  async updatePassword(
    @Body() payload: UpdatePasswordDTO,
    @Req() req: Request,
  ): Promise<IResponse> {
    await this.userProvider.updatePassword(payload, req.user.email);
    return { message: 'Password has been reset successfully' };
  }

  // PRIVACY & INFLUENCER TOGGLES
  @Post('influencer')
  async toggleInfleuncerStatus(@Req() req: Request): Promise<IResponse> {
    const data = await this.userProvider.toggleInfluencerStatus(req.user.id);
    return { data };
  }

  @Post('private')
  async togglePrivateStatus(@Req() req: Request): Promise<IResponse> {
    const data = await this.userProvider.togglePrivateStatus(req.user.id);
    return { data };
  }

  @Delete()
  async deleteUser(@Req() req: Request): Promise<IResponse> {
    const message = await this.userProvider.deleteUser(req.user.id, req.user.id);
    return { message };
  }

  @Get()
  async findAllWithIsFriend(
    @Req() req: Request,
    @Query() qParams: PaginationDTO,
  ): Promise<IResponse> {
    const data = await this.userProvider.findAllWithIsFriend(qParams, req.user.id);
    return { data };
  }
}