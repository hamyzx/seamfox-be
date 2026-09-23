import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserRepository } from './repository/user.repository';
import { CreateUserDto } from './dto/createUser.dto';
import { User } from './entities/user.entity';
import { DeletedUserArchive } from './entities/deleted-user-archive.entity';
import { UpdateUserDto } from './dto/updateUser.dto';
import { BadRequestHandler, NotFoundHandler } from '../lib/helpers/responseHandlers';
import { UpdatePasswordDTO } from './dto/updatePassword.dto';
import { UserService } from './user.service';
import { CreateSocialLoginUserDTO } from './dto/createSocialLoginUser.dto';
import { GetAllDto } from './dto/get-all.dto';
import { FollowerRepository } from './repository/follower.repository';
import { getMetaData } from '../lib/helpers/getMetaData';
import { PaginationDTO } from '../lib/dto/pagination.dto';
import { FriendRepository } from './repository/friend.repository';
import { RequestRepository } from './repository/request.repository';
import { UserStatus, UserRoles } from '../lib/enums/user.enum';
import { FolderNames } from '../lib/enums/media.enum';
import { MediaProvider } from '../media/media.provider';
import { RequestStatus } from '../lib/enums/request.enum';
import { NotificationTemplates } from '../lib/constants/notification';
import { NotificationProvider } from '../notification/notification.provider';
import { FollowStatus, FriendStatus } from '../lib/enums/relationship.enum';
import { GetAllUserDTO } from './dto/getAllUser.dto';
import { NotificationTypes } from '../lib/enums/notification.enum';

import { EmailService } from '../services/mail.service';
import {
  getAccountSuspendedTemplate,
  getAccountSuspendedText,
  getAccountReactivatedTemplate,
  getAccountReactivatedText,
} from '../lib/templates/onboarding.template';

@Injectable()
export class UserProvider {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mediaProvider: MediaProvider,
    private readonly userService: UserService,
    private readonly followerRepository: FollowerRepository,
    private readonly friendRepository: FriendRepository,
    private readonly requestRepository: RequestRepository,
    private readonly notificaitonProvider: NotificationProvider,
    @InjectRepository(DeletedUserArchive)
    private readonly archiveRepo: Repository<DeletedUserArchive>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  async getDashboardStats(): Promise<{
    onlineCount: number;
    deletedCount: number;
    todaySignups: number;
  }> {
    const ONLINE_WINDOW_MS = 5 * 60 * 1000;
    const since = new Date(Date.now() - ONLINE_WINDOW_MS);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const userRepo = this.dataSource.getRepository(User);

    const [onlineCount, deletedCount, todaySignups] = await Promise.all([
      userRepo
        .createQueryBuilder('user')
        .where('user.role = :role', { role: UserRoles.CANDIDATE })
        .andWhere('user.lastActive IS NOT NULL')
        .andWhere('user.lastActive >= :since', { since })
        .getCount(),
      userRepo
        .createQueryBuilder('user')
        .withDeleted()
        .where('user.role = :role', { role: UserRoles.CANDIDATE })
        .andWhere(
          '(user.deletedAt IS NOT NULL OR user.status = :deletedStatus)',
          { deletedStatus: UserStatus.DELETED },
        )
        .getCount(),
      userRepo
        .createQueryBuilder('user')
        .where('user.role = :role', { role: UserRoles.CANDIDATE })
        .andWhere('user.createdAt >= :start', { start: startOfToday })
        .getCount(),
    ]);

    return { onlineCount, deletedCount, todaySignups };
  }

  async markUserOffline(userId: string): Promise<{ success: boolean }> {
    if (!userId) return { success: false };
    const past = new Date(Date.now() - 60 * 60 * 1000);
    await this.dataSource
      .getRepository(User)
      .update(userId, { lastActive: past });
    return { success: true };
  }

  async createUser(payload: CreateUserDto): Promise<User> {
    if (payload.password) {
      payload.password = await this.getHashedPassword(payload.password);
    }

    const existingUser = await this.findOneByEmailOrUsername(payload.email, payload.username);

    BadRequestHandler({
      condition: existingUser?.email === payload.email,
      message: 'Email already taken',
    });

    if (!payload.username) {
      const baseUsername = `${payload.firstName}${payload.lastName}`
        .toLowerCase()
        .replace(/\s+/g, '');
      payload.username = await this.generateUniqueUsername(baseUsername);
    } else {
      BadRequestHandler({
        condition: existingUser?.username === payload.username,
        message: 'Username already taken',
      });
    }

    if (payload.profileImg) {
      const profileImg = await this.mediaProvider.moveFile(FolderNames.PROFILE, payload.profileImg);
      payload.profileImg = profileImg;
    }

    const finalPayload: any = { ...payload };
    if (payload.marketingOptIn === true) {
      finalPayload.marketingOptIn = true;
      finalPayload.marketingOptInAt = new Date();
    } else {
      finalPayload.marketingOptIn = false;
      finalPayload.marketingOptInAt = null;
    }

    return this.userRepository.createUser(finalPayload);
  }

  async findOneByRole(role: string): Promise<User | null> {
    return this.userRepository.findOneByRole(role);
  }

  async findAllByRole(role: string): Promise<User[]> {
    return this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.role = :role', { role })
      .orderBy('user.createdAt', 'ASC')
      .getMany();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async createSocialUser(payload: CreateSocialLoginUserDTO): Promise<User> {
    return this.userRepository.createUser(payload);
  }

  async findOne(id: string) {
    return this.userRepository.findOne(id);
  }

  async findOneByIdWithPassword(id: string) {
    return this.userRepository.findOneByIdWithPassword(id);
  }

  async findOneWithProfile(id: string) {
    return this.userRepository.findOneWithProfile(id);
  }

  async findOneAsAdmin(id: string) {
    const user = await this.userRepository.findOneAsAdmin(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deleteUser(id: string, deletedById: string) {
    const user = await this.userRepository.findOne(id);
    if (!user) throw new BadRequestException('User not found');
    await this.userRepository.deleteUser(id, deletedById);
    return 'User deleted successfully';
  }

  async findAllUsers(query: GetAllDto) {
    return await this.userRepository.findAllUsers(query);
  }

  async patchUser(id: string, dto: UpdateUserDto) {
    return await this.userRepository.patchUser(id, dto);
  }

  async findAllAsAdmin(qParams: GetAllUserDTO) {
    const { page = 1, limit = 20, search, status, type } = qParams;
    const skip = (page - 1) * limit;

    const [rows, total] = await this.userRepository.findAllAsAdmin(
      skip,
      limit,
      search,
      status,
      type,
    );
    return { rows, meta: getMetaData(qParams, total) };
  }

  async findAllWithIsFriend(qParams: PaginationDTO, requesterId: string) {
    const { page = 1, limit = 20, search } = qParams;
    const skip = (page - 1) * limit;

    const [[rows, total], friendships] = await Promise.all([
      this.userRepository.findAll(skip, limit, qParams.search),
      this.friendRepository.findUserFriendsWtihoutPagination(requesterId),
    ]);

    const friendIdSet = new Set<string>();
    for (const f of friendships) {
      friendIdSet.add(f.userId === requesterId ? f.friendId : f.userId);
    }

    const data = rows.map((u: any) => ({
      ...u,
      isFriend: friendIdSet.has(u.id),
    }));

    return { rows: data, meta: getMetaData(qParams, total) };
  }

  async findUserProfile(id: string, reqUserId: string) {
    const user = await this.userRepository.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    const [
      isFriend,
      isFollowed,
      friendRequestSent,
      friendRequestReceived,
      followRequestSent,
    ] = await Promise.all([
      this.friendRepository.findIsFriend(reqUserId, id),
      this.followerRepository.findIsFollowing(reqUserId, id),
      this.requestRepository.findOneFriendRequestByRequesterAndTargetUser(reqUserId, id),
      this.requestRepository.findOneFriendRequestByRequesterAndTargetUser(id, reqUserId),
      this.requestRepository.findOneFollowRequestByRequesterAndTargetUser(reqUserId, id),
    ]);

    let friend: FriendStatus = FriendStatus.FALSE;
    if (isFriend) friend = FriendStatus.FRIENDS;
    else if (friendRequestSent) friend = FriendStatus.REQUESTED;
    else if (friendRequestReceived) friend = FriendStatus.REQUEST_RECEIVED;

    let follow: FollowStatus = FollowStatus.FALSE;
    if (isFollowed) follow = FollowStatus.FOLLOWING;
    else if (followRequestSent) follow = FollowStatus.REQUESTED;

    return {
      ...user,
      friend,
      follow,
    };
  }

  async findUserFollowers(id: string, qParams: PaginationDTO) {
    const user = await this.userRepository.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    const [rows, total] = await this.followerRepository.findUserFollowers(id, qParams);
    return { rows, meta: getMetaData(qParams, total) };
  }

  async findTotalUsers() {
    return this.userRepository.findTotalUsers();
  }

  async findTotalPremiumUsers() {
    return this.userRepository.findTotalPremiumUsers();
  }

  async findTotalFreeUsers() {
    return this.userRepository.findTotalFreeUsers();
  }

  async findUserFriends(id: string, qParams: PaginationDTO) {
    const user = await this.userRepository.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    const [rows, total] = await this.friendRepository.findUserFriends(id, qParams);

    const updatedRows = rows.map((row) => {
      const isUserSide = row.userId === id;
      return {
        id: row.id,
        userId: row.userId,
        friendId: row.friendId,
        createdAt: row.createdAt,
        friend: isUserSide ? row.friend : row.user,
      };
    });

    return { rows: updatedRows, meta: getMetaData(qParams, total) };
  }

  async toggleFriendRequest(requesterId: string, targetUserId: string) {
    const existingRequest =
      await this.requestRepository.findOneFriendRequestByRequesterAndTargetUser(
        requesterId,
        targetUserId,
      );

    if (existingRequest) {
      await this.requestRepository.updateRequestStatus(existingRequest.id, RequestStatus.CANCELLED);
      return 'Friend request cancelled';
    }

    const targetUser = await this.userRepository.findOne(targetUserId);
    if (!targetUser) throw new NotFoundException('User not found');

    const requester = await this.userRepository.findOne(requesterId);
    if (!requester) throw new NotFoundException('Requester not found');

    await this.requestRepository.sendFriendRequest(requesterId, targetUserId);

    const template = NotificationTemplates.FRIEND.FRIEND_REQUEST;
    void this.notificaitonProvider.sendNotifications({
      recipientIds: [targetUserId],
      notification: { title: template.title, body: template.body(requester.username) },
      senderId: requesterId,
      metadata: { requesterId },
      type: NotificationTypes.FRIEND_REQUEST,
      dataPayload: { type: NotificationTypes.FRIEND_REQUEST, requesterId },
    });

    return 'Friend request sent';
  }

  async toggleFollow(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) throw new BadRequestException("You can't follow yourself");

    const targetUser = await this.userRepository.findOne(targetUserId);
    if (!targetUser) throw new NotFoundException('User not found');

    const requester = await this.userRepository.findOne(requesterId);
    if (!requester) throw new NotFoundException('Requester not found');

    const isAlreadyFollowing = await this.followerRepository.findIsFollowing(
      requesterId,
      targetUserId,
    );

    if (isAlreadyFollowing) {
      await this.followerRepository.removeFollower(targetUserId, requesterId);
      await this.userRepository.decreaseFollowerCount(targetUserId);
      return 'Unfollowed successfully';
    }

    if (targetUser.isPrivate) {
      const existingRequest =
        await this.requestRepository.findOneFollowRequestByRequesterAndTargetUser(
          requesterId,
          targetUserId,
        );

      if (existingRequest) {
        await this.requestRepository.updateRequestStatus(
          existingRequest.id,
          RequestStatus.CANCELLED,
        );
        return 'Follow request cancelled';
      }

      await this.requestRepository.sendFollowRequest(requesterId, targetUserId);

      const template = NotificationTemplates.FOLLOW.FOLLOW_REQUEST;
      void this.notificaitonProvider.sendNotifications({
        recipientIds: [targetUserId],
        notification: { title: template.title, body: template.body(requester.username) },
        senderId: requesterId,
        metadata: { requesterId },
        type: NotificationTypes.FOLLOW_REQUEST,
        dataPayload: { type: NotificationTypes.FOLLOW_REQUEST, requesterId },
      });

      return 'Follow request sent';
    }

    await this.followerRepository.addFollower(requesterId, targetUserId);
    await this.userRepository.increaseFollowerCount(targetUserId);

    const template = NotificationTemplates.FOLLOW.NEW_FOLLOWER;
    void this.notificaitonProvider.sendNotifications({
      recipientIds: [targetUserId],
      notification: { title: template.title, body: template.body(requester.username) },
      senderId: requesterId,
      metadata: { requesterId },
      type: NotificationTypes.FOLLOW_REQUEST_ACCEPTED,
      dataPayload: { type: NotificationTypes.FOLLOW_REQUEST_ACCEPTED, requesterId },
    });

    return 'Followed successfully';
  }

  async toggleFollowRequest(requesterId: string, targetUserId: string) {
    const existingRequest =
      await this.requestRepository.findOneFollowRequestByRequesterAndTargetUser(
        requesterId,
        targetUserId,
      );

    if (existingRequest) {
      await this.requestRepository.updateRequestStatus(existingRequest.id, RequestStatus.CANCELLED);
      return 'Follow request cancelled';
    }

    const targetUser = await this.userRepository.findOne(targetUserId);
    if (!targetUser) throw new NotFoundException('User not found');

    const requester = await this.userRepository.findOne(requesterId);
    if (!requester) throw new NotFoundException('Requester not found');

    await this.requestRepository.sendFollowRequest(requesterId, targetUserId);

    const template = NotificationTemplates.FOLLOW.FOLLOW_REQUEST;
    void this.notificaitonProvider.sendNotifications({
      recipientIds: [targetUserId],
      notification: { title: template.title, body: template.body(requester.username) },
      senderId: requesterId,
      metadata: { requesterId },
      type: NotificationTypes.FOLLOW_REQUEST,
      dataPayload: { type: NotificationTypes.FOLLOW_REQUEST, requesterId },
    });

    return 'Follow request sent';
  }

  async friendRequestResponse(requestId: string, response: RequestStatus) {
    const request = await this.requestRepository.findOneFriendRequest(requestId);
    if (!request) throw new NotFoundException('Request not found');

    await this.requestRepository.updateRequestStatus(requestId, response);
    if (response === RequestStatus.CANCELLED) return;

    await this.friendRepository.addFriend(request.requesterId, request.targetUserId);
    await this.userRepository.increaseFriendsCount(request.requesterId);
    await this.userRepository.increaseFriendsCount(request.targetUserId);
    const targetUser = await this.userRepository.findOne(request.targetUserId);
    if (targetUser) {
      const template = NotificationTemplates.FRIEND.FRIEND_ACCEPTED;
      void this.notificaitonProvider.sendNotifications({
        recipientIds: [request.requesterId],
        notification: { title: template.title, body: template.body(targetUser.username) },
        senderId: request.targetUserId,
        metadata: { requestId },
        type: NotificationTypes.FRIEND_REQUEST_ACCEPTED,
        dataPayload: { type: NotificationTypes.FRIEND_REQUEST_ACCEPTED, requestId },
      });
    }

    return 'Friend request accepted';
  }

  async followRequestResponse(requestId: string, response: RequestStatus) {
    const request = await this.requestRepository.findOneFollowRequest(requestId);
    if (!request) throw new NotFoundException('Request not found');

    await this.requestRepository.updateRequestStatus(requestId, response);
    if (response === RequestStatus.CANCELLED) return;

    await this.followerRepository.addFollower(request.requesterId, request.targetUserId);

    const targetUser = await this.userRepository.findOne(request.targetUserId);
    if (targetUser) {
      const template = NotificationTemplates.FOLLOW.NEW_FOLLOWER;
      void this.notificaitonProvider.sendNotifications({
        recipientIds: [request.requesterId],
        notification: { title: template.title, body: template.body(targetUser.username) },
        senderId: request.targetUserId,
        metadata: { requestId },
        type: NotificationTypes.FOLLOW_REQUEST_ACCEPTED,
        dataPayload: { type: NotificationTypes.FOLLOW_REQUEST_ACCEPTED, requestId },
      });
    }

    return 'Follow request accepted';
  }

  async removeFriend(userId: string, friendId: string) {
    const user = await this.userRepository.findOne(friendId);
    if (!user) throw new NotFoundException('Friend not found');

    await this.friendRepository.removeFriend(userId, friendId);
    await this.userRepository.decreaseFriendsCount(friendId);
    return await this.userRepository.decreaseFriendsCount(userId);
  }

  async removeFollower(userId: string, followerId: string) {
    const user = await this.userRepository.findOne(followerId);
    if (!user) throw new NotFoundException('Follower not found');

    await this.followerRepository.removeFollower(userId, followerId);
    return await this.userRepository.decreaseFollowerCount(userId);
  }

  async toggleInfluencerStatus(userId: string) {
    const user = await this.userRepository.findOne(userId);
    if (!user) throw new NotFoundException('Follower not found');

    user.isInfluencer = !user.isInfluencer;
    return await this.userRepository.updateUser(user);
  }

  async togglePrivateStatus(userId: string) {
    const user = await this.userRepository.findOne(userId);
    if (!user) throw new NotFoundException('Follower not found');

    user.isPrivate = !user.isPrivate;
    return await this.userRepository.updateUser(user);
  }

  async findRequests(userId: string, qParams: PaginationDTO) {
    const [friendRequests] = await this.requestRepository.findFriendRequests(userId, qParams);
    const [followRequests] = await this.requestRepository.findFollowRequests(userId, qParams);
    const joinGroupRequests = [];
    return { friendRequests, followRequests, joinGroupRequests };
  }

  async findFriendRequests(userId: string, qParams: PaginationDTO) {
    const [rows, total] = await this.requestRepository.findFriendRequests(userId, qParams);
    if (!rows.length) return { rows, meta: getMetaData(qParams, total) };
    return { rows, meta: getMetaData(qParams, total) };
  }

  async findFollowRequests(userId: string, qParams: PaginationDTO) {
    const [rows, total] = await this.requestRepository.findFollowRequests(userId, qParams);
    if (!rows.length) return { rows, meta: getMetaData(qParams, total) };
    return { rows, meta: getMetaData(qParams, total) };
  }

  async findOneBySocials(socialId: string, socialType: string) {
    return this.userRepository.findOneBySocials(socialId, socialType);
  }

  async findOneWithAllAuthRelations(userId: string) {
    return this.userRepository.findOneWithAllAuthRelations(userId);
  }

  async getOneUser(id: string) {
    const user = (await this.userRepository.findOne(id)) as User;
    BadRequestHandler({ condition: !user, message: 'User not found' });
    return user;
  }

  async findOneByEmailOrUsername(email?: string, username?: string): Promise<User | null> {
    return this.userRepository.findOneByEmailOrUsername(email, username);
  }

  async findOneDeletedUser(email?: string, username?: string): Promise<User | null> {
    return this.userRepository.findOneDeleteUser(email, username);
  }

  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    const user = (await this.findOne(id)) as User;
    BadRequestHandler({ condition: !user, message: 'User not found' });

    if (updateData.username) {
      const existingUserWithUsername = await this.findOneByEmailOrUsername(
        undefined,
        updateData.username,
      );

      BadRequestHandler({
        condition: !!(existingUserWithUsername && existingUserWithUsername?.id !== id),
        message: 'Username already exists',
      });
    }

    if (updateData.profileImg) {
      const profileImg = await this.mediaProvider.moveFile(
        FolderNames.PROFILE,
        updateData.profileImg,
      );
      updateData.profileImg = profileImg;
    }

    Object.assign(user, updateData);
    return await this.userRepository.updateUser(user);
  }

  async updateMarketingConsent(userId: string, optIn: boolean): Promise<User> {
    const user = (await this.findOne(userId)) as User;
    BadRequestHandler({ condition: !user, message: 'User not found' });

    const now = new Date();
    const updateData: any = { id: userId, marketingOptIn: optIn };

    if (optIn) {
      updateData.marketingOptInAt = now;
      updateData.marketingOptOutAt = null;
    } else {
      updateData.marketingOptOutAt = now;
    }

    return await this.userRepository.updateUser(updateData);
  }

  async toggleUserStatus(id: string): Promise<User> {
    const user = await this.userRepository.findOneWithProfile(id);
    BadRequestHandler({ condition: !user, message: 'User not found' });

    const oldStatus = user!.status;
    const newStatus =
      oldStatus === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;

    const updated = await this.userRepository.updateUser({ id, status: newStatus });

    try {
      const firstName =
        (user as any)?.candidate?.firstName ||
        (user as any)?.company?.name ||
        user!.username ||
        'there';

      const dateTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      if (newStatus === UserStatus.INACTIVE) {
        await this.emailService.send({
          to: user!.email,
          subject: 'Your Seamfox account has been suspended',
          html: getAccountSuspendedTemplate({
            firstName,
            suspensionDate: dateTime,
            reason: 'Suspended by administrator',
          }),
          text: getAccountSuspendedText({
            firstName,
            suspensionDate: dateTime,
            reason: 'Suspended by administrator',
          }),
        });
      } else if (newStatus === UserStatus.ACTIVE && oldStatus === UserStatus.INACTIVE) {
        await this.emailService.send({
          to: user!.email,
          subject: 'Your Seamfox account has been reactivated',
          html: getAccountReactivatedTemplate({ firstName }),
          text: getAccountReactivatedText({ firstName }),
        });
      }
    } catch (err) {
      console.warn('[UserProvider] toggleUserStatus email failed:', err);
    }

    return updated;
  }

  async updateUserStatusByAdmin(
    id: string,
    newStatus: UserStatus,
    reason?: string,
  ): Promise<User> {
    const user = await this.userRepository.findOneWithProfile(id);
    BadRequestHandler({ condition: !user, message: 'User not found' });

    const oldStatus = user!.status;

    const updated = await this.userRepository.updateUser({ id, status: newStatus });

    try {
      const firstName =
        (user as any)?.candidate?.firstName ||
        (user as any)?.company?.name ||
        user!.username ||
        'there';

      const dateTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      if (
        (newStatus === UserStatus.BAN || newStatus === UserStatus.INACTIVE) &&
        oldStatus !== newStatus
      ) {
        await this.emailService.send({
          to: user!.email,
          subject: 'Your Seamfox account has been suspended',
          html: getAccountSuspendedTemplate({
            firstName,
            suspensionDate: dateTime,
            reason: reason || 'Suspended by administrator',
          }),
          text: getAccountSuspendedText({
            firstName,
            suspensionDate: dateTime,
            reason: reason || 'Suspended by administrator',
          }),
        });
      } else if (
        newStatus === UserStatus.ACTIVE &&
        (oldStatus === UserStatus.BAN || oldStatus === UserStatus.INACTIVE)
      ) {
        await this.emailService.send({
          to: user!.email,
          subject: 'Your Seamfox account has been reactivated',
          html: getAccountReactivatedTemplate({ firstName }),
          text: getAccountReactivatedText({ firstName }),
        });
      }
    } catch (err) {
      console.error('[UserProvider] updateUserStatusByAdmin email FAILED:', err);
    }

    return updated;
  }

  async updateUserActiveStatus(id: string): Promise<User> {
    const user = (await this.findOne(id)) as User;
    BadRequestHandler({ condition: !user, message: 'User not found' });
    return await this.userRepository.updateUser({ id, status: UserStatus.ACTIVE });
  }

  async updateUserSubscriptionStatus(id: string): Promise<User> {
    const user = (await this.findOne(id)) as User;
    BadRequestHandler({ condition: !user, message: 'User not found' });
    return await this.userRepository.updateUser({ id, isSubscribed: true });
  }

  async updateUserSubscriptionPlan(id: string, subscriptionPlanId: string) {
    const user = (await this.findOne(id)) as User;
    BadRequestHandler({ condition: !user, message: 'User not found' });
    return this.userRepository.updateUserSubscriptionPlan(id, subscriptionPlanId);
  }

  async updatePassword(payload: UpdatePasswordDTO, email: string) {
    const { oldPassword, newPassword } = payload;

    BadRequestHandler({
      condition: oldPassword === newPassword,
      message: 'New password cannot be the same as old password',
    });
    const user = (await this.findOneByEmailOrUsername(email)) as User;
    NotFoundHandler({ condition: !user, message: 'User not found' });

    const isOldPasswordMatched = await this.isPasswordMatched(oldPassword, user.password as string);

    BadRequestHandler({
      condition: !isOldPasswordMatched,
      message: 'Old password is incorrect',
    });

    const hashedNewPassword = await this.getHashedPassword(newPassword);
    await this.userRepository.updateUser({ ...user, password: hashedNewPassword });

    return { message: 'Password updated successfully' };
  }

  async isPasswordMatched(plainPassword: string, hashedPassword: string) {
    return this.userService.isPasswordMatched(plainPassword, hashedPassword);
  }

  async getHashedPassword(password: string) {
    return this.userService.getHashPassword(password);
  }

  async increasePostCount(userId: string) {
    return this.userRepository.increasePostCount(userId);
  }

  async findAllUserSubscriptions(qParams: PaginationDTO) {
    const { page = 1, limit = 20, search } = qParams;
    const skip = (page - 1) * limit;

    const [rows, total] = await this.userRepository.findAllUsersSubscription(skip, limit, search);
    return { rows, meta: getMetaData(qParams, total) };
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    let username = base;
    let counter = 0;

    while (await this.findOneByEmailOrUsername(undefined, username)) {
      counter++;
      username = `${base}${counter}`;
    }

    return username;
  }

  async linkSocialAccount(userId: string, socialId: string, socialType: string) {
    return this.userRepository.updateUser({
      id: userId,
      socialId,
      socialType,
    } as Partial<User>);
  }

  async softDeleteUser(userId: string, scheduledDeletionAt: Date): Promise<void> {
    await this.userRepository.update(userId, { scheduledDeletionAt } as any);
    await this.userRepository.softDelete(userId);
  }

  async anonymizeAndArchiveUser(
    userId: string,
    deletedBy: 'SELF' | 'ADMIN' | 'SYSTEM' = 'SELF',
    reason?: string,
  ): Promise<void> {
    const fullUser = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.candidate', 'candidate')
      .leftJoinAndSelect('candidate.resumes', 'resumes')
      .leftJoinAndSelect('candidate.certifications', 'certifications')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!fullUser) throw new NotFoundException('User not found');

    const archivePayload: any = {
      originalUserId: fullUser.id,
      originalRole: fullUser.role,
      deletedBy,
      deletionReason: reason || null,
    };
    await (this.archiveRepo as any).save(archivePayload);

    const s3KeysToDelete: string[] = [];
    if (fullUser.profileImg) s3KeysToDelete.push(fullUser.profileImg);
    if (fullUser.candidate?.profileImage) s3KeysToDelete.push(fullUser.candidate.profileImage);
    if (fullUser.candidate?.coverImage) s3KeysToDelete.push(fullUser.candidate.coverImage);
    if (fullUser.candidate?.resumes?.length) {
      fullUser.candidate.resumes.forEach((r: any) => {
        if (r.filePath) s3KeysToDelete.push(r.filePath);
      });
    }
    if (fullUser.candidate?.certifications?.length) {
      fullUser.candidate.certifications.forEach((c: any) => {
        if (c.filePath) s3KeysToDelete.push(c.filePath);
      });
    }
    if ((fullUser.company as any)?.logo) s3KeysToDelete.push((fullUser.company as any).logo);
    if ((fullUser.company as any)?.coverImage) {
      s3KeysToDelete.push((fullUser.company as any).coverImage);
    }

    if (s3KeysToDelete.length > 0) {
      console.log(
        `[Anonymize] ${s3KeysToDelete.length} S3 files marked for deletion (skipped):`,
        userId,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const candidate = fullUser.candidate;

      if (candidate) {
        await manager.query(`DELETE FROM education WHERE "candidateId" = $1`, [candidate.id]);
        await manager.query(`DELETE FROM certification WHERE "candidateId" = $1`, [candidate.id]);
        await manager.query(`DELETE FROM resume WHERE "candidateId" = $1`, [candidate.id]);
        await manager.query(`DELETE FROM candidate_skill WHERE "candidateId" = $1`, [candidate.id]);
        await manager.query(`DELETE FROM candidate_language WHERE "candidateId" = $1`, [
          candidate.id,
        ]);
        await manager.query(`DELETE FROM candidate_nationalities WHERE "candidateId" = $1`, [
          candidate.id,
        ]);
        await manager.query(`DELETE FROM social_profile WHERE "candidateId" = $1`, [candidate.id]);

        await manager.query(
          `UPDATE candidate SET
            "firstName" = 'Anonymous',
            "lastName" = 'User',
            "profileImage" = NULL,
            "coverImage" = NULL,
            "address" = NULL,
            "longitude" = NULL,
            "latitude" = NULL,
            "countryCode" = NULL,
            "phoneNumber" = NULL,
            "alternativeNumber" = NULL,
            "alternativeNumberType" = NULL,
            "noticePeriod" = NULL,
            "current_company" = NULL,
            "description" = NULL,
            "yearOfExperience" = NULL,
            "gender" = NULL,
            "city" = NULL,
            "country" = NULL,
            "currency" = NULL,
            "minSalary" = NULL,
            "maxSalary" = NULL,
            "industryId" = NULL,
            "isEmailConfidential" = false,
            "isPhoneConfidential" = false,
            "isAddressConfidential" = false,
            "isCvConfidential" = false,
            "isLinkedinConfidential" = false,
            "isCurrentSalaryConfidential" = false,
            "isExpectedSalaryConfidential" = false
          WHERE "id" = $1`,
          [candidate.id],
        );
      }

      if (fullUser.company) {
        await manager.query(
          `UPDATE company SET
            "name" = 'Anonymous Company',
            "logo" = NULL,
            "description" = NULL,
            "website" = NULL,
            "address" = NULL,
            "phoneNumber" = NULL,
            "countryCode" = NULL,
            "city" = NULL,
            "country" = NULL
          WHERE "id" = $1`,
          [fullUser.company.id],
        );
      }

      const anonymousEmail = `deleted_${userId}@seamfox-deleted.local`;
      const anonymousUsername = `deleted_${userId.substring(0, 8)}`;

      await manager.query(
        `UPDATE users SET
          "email" = $1,
          "username" = $2,
          "password" = 'DELETED_ACCOUNT_NO_LOGIN',
          "profileImg" = NULL,
          "socialId" = NULL,
          "socialType" = NULL,
          "status" = 'DELETED',
          "isSubscribed" = false,
          "isPrivate" = false,
          "isInfluencer" = false,
          "marketingOptIn" = false,
          "marketingOptOutAt" = NOW()
        WHERE "id" = $3`,
        [anonymousEmail, anonymousUsername, userId],
      );
    });

    try {
      await this.notificaitonProvider.deleteAllTokensForUser(userId);
    } catch (err) {
      console.warn('[Anonymize] FCM token cleanup failed:', err);
    }
  }

  async hardDeleteUser(userId: string): Promise<void> {
    await this.anonymizeAndArchiveUser(userId, 'SELF');
  }

  async getMarketingConsent(userId: string): Promise<{ marketingOptIn: boolean }> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { marketingOptIn: !!user.marketingOptIn };
  }
   async findUserActivity(qParams: {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'MEMBER' | 'COMPANY';
  }) {
    const { page = 1, limit = 20, search, type } = qParams;
    const skip = (page - 1) * limit;
 
    const [rows, total] = await this.userRepository.findUserActivity(
      skip,
      limit,
      search,
      type,
    );
 
    const mapped = rows.map((u: any) => {
      const isCompany = u.role === 'COMPANY';
      const name = isCompany
        ? u.company?.name || 'Unnamed Company'
        : `${u.candidate?.firstName || ''} ${u.candidate?.lastName || ''}`.trim() ||
          'Unnamed';
      const avatar = isCompany ? u.company?.logo || '' : u.candidate?.profileImage || '';
 
      return {
        userId: u.id,
        name,
        email: u.email,
        type: isCompany ? 'COMPANY' : 'MEMBER',
        status: u.status,
        lastActive: u.lastActive,
        avatar,
      };
    });
 
    return { rows: mapped, meta: getMetaData(qParams as any, total) };
  }
}