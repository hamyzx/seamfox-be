import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follower } from '../entities/follower.entity';
import { PaginationDTO } from '../../lib/dto/pagination.dto';
@Injectable()
export class FollowerRepository {
  constructor(
    @InjectRepository(Follower)
    private readonly followerRepository: Repository<Follower>,
  ) {}
  async findUserFollowers(userId: string, qParams: PaginationDTO) {
    const { page = 1, limit = 100, search } = qParams;

    const query = this.followerRepository
      .createQueryBuilder('follower')
      .leftJoin('follower.follower', 'user')
      .select([
        'follower.id',
        'follower.followerId',
        'follower.followingId',
        'follower.createdAt',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.username',
        'user.profileImg',
      ])
      .where('follower.followingId = :userId', { userId });

    if (search) {
      query.andWhere(
        `(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.username ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    return query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('follower.createdAt', 'DESC')
      .getManyAndCount();
  }

  async removeFollower(followingId: string, followerId: string) {
    return this.followerRepository.softDelete({ followingId, followerId });
  }

  async addFollower(followerId: string, followingId: string) {
    const follower = this.followerRepository.create({ followerId, followingId });
    return this.followerRepository.save(follower);
  }

  async findIsFollowing(followerId: string, followingId: string): Promise<boolean> {
    return this.followerRepository.exists({
      where: {
        followerId,
        followingId,
      },
    });
  }
}
