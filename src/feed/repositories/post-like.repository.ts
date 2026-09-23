import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostLike } from '../entities/post-like.entity';
import { User } from '../../user/entities/user.entity';
import { Post } from '../entities/post.entity';
@Injectable()
export class PostLikeRepository {
  constructor(
    @InjectRepository(PostLike)
    private postLikeRepository: Repository<PostLike>,
  ) {}

  async findPostLikes(postId: string, skip: number, limit: number) {
    return this.postLikeRepository.findAndCount({
      where: { post: { id: postId } },
      relations: { user: true },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        user: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
          username: true,
          profileImg: true,
        },
      },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findOneLike(userId: string, postId: string) {
    return this.postLikeRepository.findOne({
      where: { user: { id: userId }, post: { id: postId } },
    });
  }

  async removeLike(userId: string, postId: string) {
    return this.postLikeRepository.softDelete({ user: { id: userId }, post: { id: postId } });
  }

  async createLike(user: User, post: Post) {
    const like = this.postLikeRepository.create({ user, post });
    return this.postLikeRepository.save(like);
  }
}
