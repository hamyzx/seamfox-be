import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, In, IsNull, Not, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/createUser.dto';
import { UpdateUserDto } from '../dto/updateUser.dto';
import { UserRoles, UserStatus } from '../../lib/enums/user.enum';
import { SubscriptionStatus } from '../../lib/enums/subscription-plan.enum';
import { v4 as uuid } from 'uuid';
import { GetAllDto } from '../dto/get-all.dto';
import { handleDBError } from '../../lib/error/dataBaseError';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createUser(payload: CreateUserDto): Promise<User> {
    try {
      const user = this.userRepository.create(payload);
      return await this.userRepository.save(user);
    } catch (err) {
      handleDBError(err);
    }
  }

  async findOneByEmailOrUsername(email?: string, username?: string): Promise<User | null> {
    const where = [] as FindOptionsWhere<User>[];

    if (email) {
      where.push({ email });
    }
    if (username) {
      where.push({ username });
    }

    // 🔥 No withDeleted() — only return active users
    // Soft-deleted users have a separate query: findOneDeleteUser
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.candidate', 'candidate')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('user.subscription', 'subscription', 'subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .where(where)
      .getOne();
  }

  async findSuperAdmins(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRoles.SUPER_ADMIN },
    });
  }

  async findOneDeleteUser(email?: string, username?: string): Promise<User | null> {
    const where = [] as FindOptionsWhere<User>[];

    if (email) {
      where.push({
        emailBackup: email,
        deletedAt: Not(IsNull()),
      });
    }
    if (username) {
      where.push({
        username,
        deletedAt: Not(IsNull()),
      });
    }

    return this.userRepository.findOne({
      where,
      withDeleted: true,
      relations: ['deletedBy'],
    });
  }

  async patchUser(id: string, dto: UpdateUserDto) {
    try {
      return this.userRepository.update(id, dto);
    } catch (error) {
      handleDBError(error);
    }
  }

  async updateUser(updateData: Partial<User>): Promise<User> {
    return this.userRepository.save(updateData);
  }

  async updateUserSubscriptionPlan(id: string, subscriptionPlanId: string) {
    return this.userRepository.update(id, {});
  }

  async updateUserTierAndPoints(updateData: Partial<User>): Promise<User> {
    return this.userRepository.save(updateData);
  }

  async findOne(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async findOneWithAllAuthRelations(userId: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.candidate', 'candidate')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('user.subscription', 'subscription', 'subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async findOneByIdWithPassword(id: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findOneWithProfile(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.candidate', 'candidate')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('user.subscription', 'subscription')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findOneWithAllRelations(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.contentCreated', 'content')
      .leftJoin('user.contentLikes', 'likes')
      .leftJoin('user.contentComments', 'comments')
      .leftJoin('user.contentShares', 'shares')
      .leftJoin('user.contentReports', 'reports')
      .leftJoin('user.following', 'following')
      .leftJoin('user.followers', 'followers')
      .leftJoin('user.friends', 'friends')
      .leftJoin('user.friendedBy', 'friendedBy')
      .leftJoin('user.sentRequests', 'sentRequests')
      .leftJoin('user.receivedRequests', 'receivedRequests')
      .leftJoin('user.conversationParticipants', 'participants')
      .where('user.id = :id', { id })
      .select([
        'user.id',
        'content.id',
        'likes.id',
        'comments.id',
        'shares.id',
        'reports.id',
        'following.id',
        'followers.id',
        'friends.id',
        'friendedBy.id',
        'sentRequests.id',
        'receivedRequests.id',
        'participants.id',
      ])
      .getOne();

    return user;
  }

  async findOneAsAdmin(id: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.contentCreated', 'content')
      .leftJoinAndSelect('content.attachments', 'attachments')
      .leftJoinAndSelect('content.createdBy', 'contentCreator')
      .leftJoinAndSelect('content.eventDetails', 'eventDetails')
      .leftJoinAndSelect('content.eventInterests', 'eventInterests')
      .leftJoinAndSelect('eventInterests.user', 'interestedUser')
      .leftJoinAndSelect('content.category', 'category')
      .leftJoinAndSelect('user.conversationParticipants', 'participants')
      .leftJoinAndSelect('participants.conversation', 'conversation', 'conversation.isGroup = true')
      .leftJoinAndSelect('conversation.createdBy', 'conversationCreatedBy')
      .loadRelationCountAndMap(
        'conversation.totalParticipantsCount',
        'conversation.participants',
        'participant',
        (qb) => qb.andWhere('participant.deletedAt IS NULL'),
      )
      .where('user.id = :id', { id })
      .getOne();
  }

  async findAllAsAdmin(
    skip: number,
    take: number,
    search?: string,
    status?: UserStatus,
    type?: 'FREE' | 'PREMIUM',
  ) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.subscriptionPlan', 'subscriptionPlan')
      .where('user.role = :role', { role: UserRoles.CANDIDATE })
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (search) {
      qb.andWhere(`(user.firstName ILIKE :search OR user.lastName ILIKE :search)`, {
        search: `%${search}%`,
      });
    }

    if (status) {
      qb.andWhere('user.status = :status', { status });
    }

    if (type === 'PREMIUM') {
      qb.andWhere('user.subscriptionPlan IS NOT NULL');
    } else if (type === 'FREE') {
      qb.andWhere('user.subscriptionPlan IS NULL');
    }

    return qb.getManyAndCount();
  }

  async findAllUsers(query: GetAllDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC', filters, search } = query;

      const qb = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('user.candidate', 'candidate')
        .leftJoinAndSelect('candidate.jobTitle', 'jobTitle');

      qb.andWhere('user.role != :superAdminRole', { superAdminRole: UserRoles.SUPER_ADMIN });

      if (search) {
        qb.andWhere(
          `(
            LOWER(user.firstName) LIKE :search OR
            LOWER(user.lastName) LIKE :search OR
            LOWER(user.email) LIKE :search OR
            LOWER(user.username) LIKE :search OR
            LOWER(user.currentLocation) LIKE :search
          )`,
          { search: `%${search.toLowerCase()}%` },
        );
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`user.${field} = :${field}`, { [field]: filters[field] });
        });
      }

      qb.orderBy(`user.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      qb.skip((+page - 1) * +limit).take(+limit);

      const [data, total] = await qb.getManyAndCount();

      return {
        data,
        total,
        page: +page,
        limit: +limit,
      };
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAll(skip: number, take: number, search?: string) {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.firstName',
        'u.lastName',
        'u.username',
        'u.profileImg',
        'u.createdAt',
        'u.status',
      ])
      .where('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('u.role != :superRole', { superRole: UserRoles.SUPER_ADMIN });

    const q = search?.trim();
    if (q) {
      qb.andWhere('(u.firstName ILIKE :q OR u.lastName ILIKE :q OR u.username ILIKE :q)', {
        q: `%${q}%`,
      });
    }
    qb.orderBy('u.createdAt', 'DESC').skip(skip).take(take);

    return qb.getManyAndCount();
  }

  async findOneByRole(role: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role })
      .getOne();
  }

  async findOneBySocials(socialId: string, socialType: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.candidate', 'candidate')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('user.subscription', 'subscription', 'subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .where('user.socialId = :socialId AND user.socialType = :socialType', {
        socialId,
        socialType,
      })
      .getOne();
  }

  async findUserProfile(id: string) {
    return this.userRepository.createQueryBuilder('user').where('user.id = :id', { id }).getOne();
  }

  async findUserFollowers(id: string) {
    return this.userRepository.findOne({ where: { id }, relations: ['followers'] });
  }

  async increaseFriendsCount(id: string) {
    return this.userRepository.increment({ id }, 'totalFriends', 1);
  }

  async increaseFollowerCount(id: string) {
    return this.userRepository.increment({ id }, 'totalFollowers', 1);
  }

  async decreaseFriendsCount(id: string) {
    return this.userRepository.decrement({ id }, 'totalFriends', 1);
  }

  async decreaseFollowerCount(id: string) {
    return this.userRepository.decrement({ id }, 'totalFollowers', 1);
  }

  async increasePostCount(id: string) {
    return this.userRepository.increment({ id }, 'totalPosts', 1);
  }

  async decreasePostCount(id: string) {
    return this.userRepository.decrement({ id }, 'totalPosts', 1);
  }

  async increaseEventCount(id: string) {
    return this.userRepository.increment({ id }, 'totalEvents', 1);
  }

  async decreaseEventCount(id: string) {
    return this.userRepository.decrement({ id }, 'totalEvents', 1);
  }

  async findTotalUsers() {
    return this.userRepository.count();
  }

  async findTotalPremiumUsers() {
    return this.userRepository.count({
      where: {},
    });
  }

  async findTotalFreeUsers() {
    return this.userRepository.count({
      where: {},
    });
  }

  async deleteUser(userId: string, deletedById: string): Promise<void> {
    const now = new Date();

    await this.userRepository.manager.transaction(async (manager: EntityManager) => {
      const [userAsFriend, userAsOther] = await Promise.all([
        manager
          .createQueryBuilder()
          .select('"friendId"', 'id')
          .from('friends', 'f')
          .where('"userId" = :userId', { userId })
          .getRawMany(),
        manager
          .createQueryBuilder()
          .select('"userId"', 'id')
          .from('friends', 'f')
          .where('"friendId" = :userId', { userId })
          .getRawMany(),
      ]);

      const friendIds = [...new Set([...userAsFriend, ...userAsOther].map((u) => u.id))].filter(
        (id) => id !== userId,
      );

      if (friendIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update('users')
          .set({ totalFriends: () => 'GREATEST(totalFriends - 1, 0)' })
          .where({ id: In(friendIds) })
          .execute();
      }

      const followerIds = await manager
        .createQueryBuilder()
        .select('"followerId"', 'id')
        .from('followers', 'f')
        .where('"followingId" = :userId', { userId })
        .getRawMany();

      const cleanFollowerIds = followerIds.map((f) => f.id);
      if (cleanFollowerIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update('users')
          .set({ totalFollowers: () => 'GREATEST(totalFollowers - 1, 0)' })
          .where({ id: In(cleanFollowerIds) })
          .execute();
      }

      const tables: [string, string][] = [
        ['content', '"createdBy" = :userId'],
        ['content_likes', '"userId" = :userId'],
        ['content_comments', '"userId" = :userId'],
        ['content_shares', '"userId" = :userId'],
        ['content_report', '"userId" = :userId'],
        ['followers', '"followerId" = :userId OR "followingId" = :userId'],
        ['friends', '"userId" = :userId OR "friendId" = :userId'],
        ['requests', '"requesterId" = :userId OR "targetUserId" = :userId'],
        ['conversation_participants', '"userId" = :userId'],
        ['fcm_tokens', '"createdBy" = :userId'],
      ];

      for (const [table, condition] of tables) {
        await manager
          .createQueryBuilder()
          .update(table)
          .set({ deletedAt: now })
          .where(condition, { userId })
          .execute();
      }

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new Error('User not found');

      const newEmail = `deleted-${uuid()}@domain.com`;
      const newUsername = `deleted-${uuid()}`;
      const deletedByValue = deletedById !== userId ? deletedById : null;

      await manager
        .createQueryBuilder()
        .update(User)
        .set({
          emailBackup: user.email,
          username: newUsername,
          email: newEmail,
          firstName: 'Deleted',
          lastName: 'User',
          deletedAt: now,
          deletedBy: deletedByValue ? { id: deletedByValue } : null,
          status: UserStatus.INACTIVE,
        })
        .where('id = :userId', { userId })
        .execute();
    });
  }

  async findAllUsersSubscription(skip: number, limit: number, search?: string) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.subscriptionPlan', 'subscriptionPlan')
      .leftJoinAndSelect('user.subscriptionPayments', 'subscriptionPayments')
      .leftJoinAndSelect('user.payments', 'payments');

    if (search) {
      qb.where('LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    qb.skip(skip).take(limit).orderBy('user.createdAt', 'DESC');

    return qb.getManyAndCount();
  }

  async update(userId: string, data: Partial<User>): Promise<void> {
    await this.userRepository.update(userId, data as any);
  }

  async softDelete(userId: string): Promise<void> {
    await this.userRepository.softDelete(userId);
  }
  async hardDelete(userId: string): Promise<void> {
    await this.userRepository.delete(userId);
  }

  async findUserActivity(
    skip: number,
    take: number,
    search?: string,
    type?: 'MEMBER' | 'COMPANY',
  ) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.candidate', 'candidate')
      .leftJoin('user.company', 'company')
      .where('user.role IN (:...roles)', {
        roles: [UserRoles.CANDIDATE, UserRoles.COMPANY],
      })
      .select([
        'user.id',
        'user.email',
        'user.role',
        'user.status',
        'user.lastActive',
        'candidate.id',
        'candidate.firstName',
        'candidate.lastName',
        'candidate.profileImage',
        'company.id',
        'company.name',
        'company.logo',
      ]);
 
    if (type === 'MEMBER') {
      qb.andWhere('user.role = :r', { r: UserRoles.CANDIDATE });
    } else if (type === 'COMPANY') {
      qb.andWhere('user.role = :r', { r: UserRoles.COMPANY });
    }
 
    if (search) {
      const s = `%${search.toLowerCase()}%`;
      qb.andWhere(
        `(
          LOWER(user.email) LIKE :s OR
          LOWER(candidate.firstName) LIKE :s OR
          LOWER(candidate.lastName) LIKE :s OR
          LOWER(company.name) LIKE :s
        )`,
        { s },
      );
    }
 
    qb.orderBy('user.lastActive', 'DESC', 'NULLS LAST')
      .skip(skip)
      .take(take);
 
    return qb.getManyAndCount();
  }
}
