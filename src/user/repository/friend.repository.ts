import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDTO } from '../../lib/dto/pagination.dto';
import { Friend } from '../entities/friend.entity';
@Injectable()
export class FriendRepository {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,
  ) {}
  async findUserFriends(userId: string, qParams: PaginationDTO) {
    const { page = 1, limit = 100, search } = qParams;

    const query = this.friendRepository
      .createQueryBuilder('friend')
      .leftJoin('friend.friend', 'user1') // for friendId
      .leftJoin('friend.user', 'user2') // for userId
      .select([
        'friend.id',
        'friend.userId',
        'friend.friendId',
        'friend.createdAt',
        'user1.id',
        'user1.firstName',
        'user1.lastName',
        'user1.username',
        'user1.profileImg',
        'user2.id',
        'user2.firstName',
        'user2.lastName',
        'user2.username',
        'user2.profileImg',
      ])
      .where('friend.userId = :userId OR friend.friendId = :userId', { userId });

    if (search) {
      query.andWhere(
        `(user1.firstName ILIKE :search OR user1.lastName ILIKE :search OR user1.username ILIKE :search
          OR user2.firstName ILIKE :search OR user2.lastName ILIKE :search OR user2.username ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    return query
      .orderBy('friend.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findUserFriendsWtihoutPagination(userId: string) {
    const query = this.friendRepository
      .createQueryBuilder('friend')
      .leftJoin('friend.friend', 'user1') // for friendId
      .leftJoin('friend.user', 'user2') // for userId
      .select([
        'friend.id',
        'friend.userId',
        'friend.friendId',
        'friend.createdAt',
        'user1.id',
        'user1.firstName',
        'user1.lastName',
        'user1.username',
        'user1.profileImg',
        'user2.id',
        'user2.firstName',
        'user2.lastName',
        'user2.username',
        'user2.profileImg',
      ])
      .where('friend.userId = :userId OR friend.friendId = :userId', { userId });

    return query.orderBy('friend.createdAt', 'DESC').getMany();
  }

  async removeFriend(userId: string, friendId: string) {
    return this.friendRepository.softDelete({ userId, friendId });
  }

  async addFriend(userId: string, friendId: string) {
    const friend = this.friendRepository.create({ userId, friendId });
    return this.friendRepository.save(friend);
  }

  async findIsFriend(userId: string, friendId: string) {
    return this.friendRepository.exists({
      where: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    });
  }
}
