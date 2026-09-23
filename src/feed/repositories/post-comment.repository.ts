import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PostComment } from '../entities/post-comment.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { Company } from '../../company/entities/company.entity';
@Injectable()
export class PostCommentRepository {
  constructor(
    @InjectRepository(PostComment)
    private postCommentRepository: Repository<PostComment>,
  ) {}

  // async findPostComments(postId: string, skip: number, limit: number) {
  //   return this.postCommentRepository.findAndCount({
  //     where: { post: { id: postId } },
  //     relations: { user: true },
  //     select: {
  //       id: true,
  //       createdAt: true,
  //       comment: true,
  //       user: {
  //         id: true,
  //         role: true,
  //         firstName: true,
  //         lastName: true,
  //         username: true,
  //         profileImg: true,
  //       },
  //     },
  //     skip,
  //     take: limit,
  //     order: { createdAt: 'DESC' },
  //   });
  // }

  async findPostComments(postId: string, skip: number, limit: number): Promise<[any[], number]> {
    const qb = this.postCommentRepository
      .createQueryBuilder('c')

      .leftJoin('c.user', 'u')
      .leftJoin('c.parent', 'parent')

      .leftJoin(Candidate, 'cand', 'cand."userId" = u.id')
      .leftJoin(Company, 'comp', 'comp."userId" = u.id')

      .select([
        'c.id AS id',
        'c.comment AS comment',
        'c.createdAt AS created_at',
        'parent.id AS parent_id',
        'u.id AS user_id',
        'u.role AS role',
        'u.username AS username',
      ])

      .addSelect(
        `
      CASE
        WHEN u.role = 'COMPANY' THEN COALESCE(NULLIF(comp.name, ''), u.username, '')
        WHEN cand."firstName" IS NOT NULL THEN cand."firstName"
        WHEN u."firstName" IS NOT NULL THEN u."firstName"
        ELSE COALESCE(u.username, '')
      END
    `,
        'firstname',
      )

      .addSelect(
        `
      CASE
        WHEN u.role = 'COMPANY' THEN ''
        WHEN cand."lastName" IS NOT NULL THEN cand."lastName"
        WHEN u."lastName" IS NOT NULL THEN u."lastName"
        ELSE ''
      END
    `,
        'lastname',
      )

      .addSelect(
        `
      CASE
        WHEN u.role = 'COMPANY' THEN COALESCE(comp.logo, u."profileImg")
        ELSE COALESCE(cand."profileImage", u."profileImg")
      END
    `,
        'profileimg',
      )

      .where('c.postId = :postId', { postId })
      .andWhere('c.deletedAt IS NULL')

      .orderBy('c.createdAt', 'DESC')

      .offset(skip)
      .limit(limit);

    const raw = await qb.getRawMany();
    const total = await qb.getCount();

    const rows = raw.map((r) => ({
      id: r.id,
      comment: r.comment,
      createdAt: r.created_at,
      parentId: r.parent_id,

      user: {
        id: r.user_id,
        role: r.role,
        username: r.username,

        firstName: r.firstname,
        lastName: r.lastname,
        profileImg: r.profileimg,
      },
    }));

    return [rows, total];
  }

  async deleteComment(commentId: string) {
    return this.postCommentRepository.softDelete(commentId);
  }

  async findOneComment(commentId: string) {
    return this.postCommentRepository.findOne({
      where: { id: commentId },
      relations: ['user', 'user.candidate', 'user.company', 'post'],
    });
  }

  async createComment(payload: DeepPartial<PostComment>) {
    const comment = this.postCommentRepository.create(payload);
    return this.postCommentRepository.save(comment);
  }

  // async updateComment(userId: string, commentId: string, text: string) {
  //   const comment = await this.postCommentRepository.findOneComment(commentId);

  //   if (!comment) throw new NotFoundException('Comment not found');

  //   if (comment.user.id !== userId) {
  //     throw new ForbiddenException('You can only edit your own comment');
  //   }

  //   comment.comment = text;

  //   return await this.postCommentRepository.updateComment(comment);
  // }

  async updateComment(comment: PostComment) {
    return this.postCommentRepository.save(comment);
  }
}