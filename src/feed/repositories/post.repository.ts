import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { MediaType } from '../../lib/enums/media-type.enum';
import { UpdatePostDto } from '../dto/updatePost.dto';
import { GetAllFeedDto } from '../dto/get-all-feed.dto';
import { handleDBError } from '../../lib/error/dataBaseError';
import { UserRoles } from '../../lib/enums/user.enum';

@Injectable()
export class PostRepository {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async create(payload: DeepPartial<Post>) {
    try {
      const post = this.postRepository.create(payload);
      return this.postRepository.save(post);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findOne(postId: string) {
    return this.postRepository.findOne({
      where: { id: postId },
      relations: [
        'createdBy',
        'createdBy.candidate',
        'createdBy.company',
        'sharedPost',
        'sharedPost.createdBy',
        'sharedPost.createdBy.candidate',
        'sharedPost.createdBy.company',
        'sharedPost.media',
        'sharedPost.sharedBlog',
        'sharedPost.sharedBlog.category',
        'sharedPost.poll',
        'sharedPost.poll.options',
        'media',
        'poll',
        'poll.options',
        'sharedBlog',
        'sharedBlog.category',
      ],
      order: {
        poll: { options: { displayOrder: 'ASC' } },
      } as any,
    });
  }

  async update(payload: DeepPartial<Post>) {
    return this.postRepository.save(payload);
  }

  async merge(post: Post, patch: UpdatePostDto) {
    return this.postRepository.merge(post, patch);
  }

  async remove(id: string) {
    return this.postRepository.softDelete(id);
  }

  async findProviderFeed(
    serviceProviderId: string,
    requesterId: string,
    skip: number,
    limit: number,
    search?: string,
    mediaType?: MediaType,
  ) {
    const query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.media', 'media')
      .leftJoinAndSelect('post.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.serviceProvider', 'serviceProvider')
      .leftJoin('serviceProvider.professions', 'spProfession')
      .leftJoin('spProfession.profession', 'profession')
      .leftJoin('post.likes', 'like', 'like.userId = :requesterId', { requesterId })
      .select([
        'post.id',
        'post.title',
        'post.createdAt',
        'post.description',
        'post.location',
        'post.visibility',
        'post.totalLikes',
        'post.totalComments',
        'post.totalShares',

        'media.id',
        'media.mediaUrl',

        'createdBy.id',
        'createdBy.firstName',
        'createdBy.lastName',
        'createdBy.profileImg',
        'createdBy.email',

        'profession.name',
      ])
      .where('createdBy.id = :serviceProviderId', { serviceProviderId })
      .orderBy('post.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .addSelect('CASE WHEN like.id IS NOT NULL THEN true ELSE false END', 'isLiked');

    if (search) {
      query.andWhere('(post.title ILIKE :search OR post.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (mediaType) {
      query.andWhere('media.mediaType = :mediaType', { mediaType });
    }

    return query.getRawAndEntities();
  }

  async findTotalProviderFeed(serviceProviderId: string) {
    return this.postRepository
      .createQueryBuilder('post')
      .leftJoin('post.createdBy', 'createdBy')
      .where('createdBy.id = :serviceProviderId', { serviceProviderId })
      .getCount();
  }

  async findTotalFeed(mediaType?: MediaType): Promise<number> {
    const query = this.postRepository.createQueryBuilder('post').leftJoin('post.media', 'media');

    if (mediaType) {
      query.where('media.mediaType = :mediaType', { mediaType });
    }

    return query.getCount();
  }

  async decreaseCommentCount(postId: string) {
    return this.postRepository.decrement({ id: postId }, 'totalComments', 1);
  }

  async decreaseLikeCount(postId: string) {
    return this.postRepository.decrement({ id: postId }, 'totalLikes', 1);
  }

  async increaseLikeCount(postId: string) {
    return this.postRepository.increment({ id: postId }, 'totalLikes', 1);
  }

  async increaseCommentCount(postId: string) {
    return this.postRepository.increment({ id: postId }, 'totalComments', 1);
  }

  private formatPoll(poll: any, userVotedOptionId: string | null) {
    if (!poll) return null;
    const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
    return {
      id: poll.id,
      question: poll.question,
      expiresAt: poll.expiresAt,
      isExpired,
      totalVotes: poll.totalVotes,
      userVotedOptionId: userVotedOptionId || null,
      options: (poll.options || [])
        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
        .map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          voteCount: opt.voteCount,
          percentage:
            poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0,
        })),
    };
  }

  async findFollowingFeed(query: GetAllFeedDto, userId: string) {
    try {
      const { page = 1, limit = 10, search } = query;

      const qb = this.postRepository
        .createQueryBuilder('post')
        .innerJoin(
          'followers',
          'f',
          `f."followingId" = post."createdBy" AND f."followerId" = :userId AND f."deleted_at" IS NULL`,
          { userId },
        )
        .leftJoinAndSelect('post.media', 'media')
        .leftJoinAndSelect('post.createdBy', 'createdBy')
        .leftJoinAndSelect('createdBy.candidate', 'candidate')
        .leftJoinAndSelect('createdBy.company', 'company')
        .leftJoinAndSelect('post.poll', 'poll')
        .leftJoinAndSelect('poll.options', 'pollOption')
        .leftJoin('post.likes', 'likes')
        .select([
          'post.id',
          'post.title',
          'post.description',
          'post.location',
          'post.visibility',
          'post.createdAt',
          'post.status',
          'post.tags',
          'createdBy.id',
          'createdBy.firstName',
          'createdBy.lastName',
          'createdBy.profileImg',
          'createdBy.email',
          'createdBy.role',
          'media.id',
          'media.mediaUrl',
          'media.mediaType',
          'candidate',
          'company',
          'poll.id',
          'poll.question',
          'poll.expiresAt',
          'poll.totalVotes',
          'pollOption.id',
          'pollOption.text',
          'pollOption.voteCount',
          'pollOption.displayOrder',
        ])
        .addSelect('COUNT(DISTINCT likes.id)', 'totalLikes')
        .addSelect(
          `(
            SELECT COUNT(c.id)
            FROM post_comments c
            WHERE c."postId" = post.id AND c."deletedAt" IS NULL
          )`,
          'totalComments',
        )
        .addSelect(
          `(
            SELECT COALESCE(json_agg(row_to_json(cmt)), '[]'::json)
            FROM (
              SELECT
                c.id,
                c.comment,
                c."createdAt",
                json_build_object(
                  'id', u.id,
                  'firstName',
                    CASE WHEN cand."firstName" IS NOT NULL THEN cand."firstName" ELSE u."firstName" END,
                  'lastName',
                    CASE WHEN cand."lastName" IS NOT NULL THEN cand."lastName" ELSE u."lastName" END,
                  'companyName', comp.name,
                  'profileImg', COALESCE(cand."profileImage", u."profileImg"),
                  'role', u."role"
                ) AS user
              FROM post_comments c
              LEFT JOIN users u ON c."userId" = u.id
              LEFT JOIN candidate cand ON cand."userId" = u.id
              LEFT JOIN company comp ON comp."userId" = u.id
              WHERE c."postId" = post.id AND c."deletedAt" IS NULL
              ORDER BY c."createdAt" DESC
              LIMIT 2
            ) cmt
          )`,
          'twoComments',
        )
        .addSelect(
          `CASE
            WHEN EXISTS (
              SELECT 1 FROM post_likes l
              WHERE l."postId" = post.id AND l."userId" = :userId AND l."deletedAt" IS NULL
            )
            THEN true ELSE false
          END`,
          'isOwnLike',
        )
        .addSelect(
          `CASE
            WHEN EXISTS (
              SELECT 1 FROM post_saves s
              WHERE s."postId" = post.id AND s."userId" = :userId
            )
            THEN true ELSE false
          END`,
          'isSaved',
        )
        .addSelect(
          `(
            SELECT pv."optionId"
            FROM poll_votes pv
            WHERE pv."pollId" = poll.id AND pv."userId" = :userId
            LIMIT 1
          )`,
          'userVotedOptionId',
        )
        .setParameter('userId', userId)
        .andWhere('post.status = :published', { published: 'PUBLISHED' })
        .andWhere('createdBy.status != :banStatus', { banStatus: 'BAN' })
        .groupBy('post.id')
        .addGroupBy('createdBy.id')
        .addGroupBy('media.id')
        .addGroupBy('candidate.id')
        .addGroupBy('company.id')
        .addGroupBy('poll.id')
        .addGroupBy('pollOption.id')
        .orderBy('post.createdAt', 'DESC')
        .skip((+page - 1) * +limit)
        .take(+limit);

      if (search) {
        qb.andWhere(`(LOWER(post.title) LIKE :search OR LOWER(post.description) LIKE :search)`, {
          search: `%${search.toLowerCase()}%`,
        });
      }

      const { entities, raw } = await qb.getRawAndEntities();

      const data = entities.map((post, i) => {
        const userVotedOptionId = raw[i]?.userVotedOptionId || null;

        return {
          ...post,
          totalLikes: Number(raw[i]?.totalLikes) || 0,
          totalComments: Number(raw[i]?.totalComments) || 0,
          isOwnLike: raw[i]?.isOwnLike === true || raw[i]?.isOwnLike === 'true',
          isSaved: raw[i]?.isSaved === true || raw[i]?.isSaved === 'true',
          comments:
            typeof raw[i]?.twoComments === 'string'
              ? JSON.parse(raw[i].twoComments)
              : raw[i]?.twoComments || [],
          poll: this.formatPoll(post.poll, userVotedOptionId),
        };
      });

      const total = await qb.getCount();

      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAllPost(query: GetAllFeedDto, userId: number, userRole: UserRoles) {
    try {
      const { page = 1, limit = 10, sortBy = 'id', order = 'ASC', search, filters } = query;

      const qb = this.postRepository
        .createQueryBuilder('post')

        .leftJoinAndSelect('post.media', 'media')
        .leftJoinAndSelect('post.createdBy', 'createdBy')
        .leftJoinAndSelect('createdBy.candidate', 'candidate')
        .leftJoinAndSelect('createdBy.company', 'company')

        .leftJoinAndSelect('post.sharedPost', 'sharedPost')
        .leftJoinAndSelect('sharedPost.createdBy', 'sharedCreatedBy')
        .leftJoinAndSelect('sharedCreatedBy.candidate', 'sharedCandidate')
        .leftJoinAndSelect('sharedCreatedBy.company', 'sharedCompany')
        .leftJoinAndSelect('sharedPost.media', 'sharedMedia')

        .leftJoinAndSelect('post.sharedBlog', 'sharedBlog')
        .leftJoinAndSelect('sharedBlog.category', 'sharedBlogCategory')

        .leftJoinAndSelect('sharedPost.sharedBlog', 'nestedSharedBlog')
        .leftJoinAndSelect('nestedSharedBlog.category', 'nestedSharedBlogCategory')

        .leftJoinAndSelect('post.poll', 'poll')
        .leftJoinAndSelect('poll.options', 'pollOption')

        .leftJoinAndSelect('sharedPost.poll', 'sharedPoll')
        .leftJoinAndSelect('sharedPoll.options', 'sharedPollOption')

        .leftJoin('post.likes', 'likes')

        .select([
          'post.id',
          'post.title',
          'post.description',
          'post.location',
          'post.visibility',
          'post.createdAt',
          'post.status',
          'post.tags',

          'createdBy.id',
          'createdBy.firstName',
          'createdBy.lastName',
          'createdBy.profileImg',
          'createdBy.email',
          'createdBy.role',
          'createdBy.status',

          'media.id',
          'media.mediaUrl',
          'media.mediaType',

          'candidate',
          'company',

          'sharedPost.id',
          'sharedPost.title',
          'sharedPost.description',
          'sharedPost.createdAt',
          'sharedPost.tags',

          'sharedCreatedBy.id',
          'sharedCreatedBy.firstName',
          'sharedCreatedBy.lastName',
          'sharedCreatedBy.profileImg',
          'sharedCreatedBy.role',
          'sharedCandidate',
          'sharedCompany',

          'sharedMedia.id',
          'sharedMedia.mediaUrl',
          'sharedMedia.mediaType',

          'sharedBlog.id',
          'sharedBlog.title',
          'sharedBlog.slug',
          'sharedBlog.shortDescription',
          'sharedBlog.thumbnail',
          'sharedBlog.coverImage',
          'sharedBlog.readTime',
          'sharedBlog.badgeLabel',
          'sharedBlog.isEditorPick',
          'sharedBlog.createdAt',
          'sharedBlogCategory.id',
          'sharedBlogCategory.name',
          'sharedBlogCategory.slug',

          'nestedSharedBlog.id',
          'nestedSharedBlog.title',
          'nestedSharedBlog.slug',
          'nestedSharedBlog.shortDescription',
          'nestedSharedBlog.thumbnail',
          'nestedSharedBlog.coverImage',
          'nestedSharedBlog.readTime',
          'nestedSharedBlog.badgeLabel',
          'nestedSharedBlog.isEditorPick',
          'nestedSharedBlog.createdAt',
          'nestedSharedBlogCategory.id',
          'nestedSharedBlogCategory.name',
          'nestedSharedBlogCategory.slug',

          'poll.id',
          'poll.question',
          'poll.expiresAt',
          'poll.totalVotes',
          'pollOption.id',
          'pollOption.text',
          'pollOption.voteCount',
          'pollOption.displayOrder',

          'sharedPoll.id',
          'sharedPoll.question',
          'sharedPoll.expiresAt',
          'sharedPoll.totalVotes',
          'sharedPollOption.id',
          'sharedPollOption.text',
          'sharedPollOption.voteCount',
          'sharedPollOption.displayOrder',
        ])

        .addSelect('COUNT(DISTINCT likes.id)', 'totalLikes')

        .addSelect(
          `
        (
          SELECT COUNT(c.id)
          FROM post_comments c
          WHERE c."postId" = post.id
          AND c."deletedAt" IS NULL
        )
        `,
          'totalComments',
        )

        .addSelect(
          `
        (
          SELECT COALESCE(json_agg(row_to_json(cmt)), '[]'::json)
          FROM (
            SELECT 
              c.id,
              c.comment,
              c."createdAt",
              json_build_object(
                'id', u.id,
                'firstName', COALESCE(cand."firstName", u."firstName"),
                'lastName', COALESCE(cand."lastName", u."lastName"),
                'companyName', comp.name,
                'profileImg', COALESCE(cand."profileImage", u."profileImg"),
                'role', u."role"
              ) AS user
            FROM post_comments c
            LEFT JOIN users u ON c."userId" = u.id
            LEFT JOIN candidate cand ON cand."userId" = u.id
            LEFT JOIN company comp ON comp."userId" = u.id
            WHERE c."postId" = post.id
            AND c."deletedAt" IS NULL
            ORDER BY c."createdAt" DESC
            LIMIT 2
          ) cmt
        )
        `,
          'twoComments',
        )

        .addSelect(
          `
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM post_likes l
            WHERE l."postId" = post.id
            AND l."userId" = :userId
            AND l."deletedAt" IS NULL
          )
          THEN true ELSE false
        END
        `,
          'isOwnLike',
        )

        .addSelect(
          `
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM post_saves s
            WHERE s."postId" = post.id
            AND s."userId" = :userId
          )
          THEN true ELSE false
        END
        `,
          'isSaved',
        )

        .addSelect(
          `(
            SELECT pv."optionId"
            FROM poll_votes pv
            WHERE pv."pollId" = poll.id AND pv."userId" = :userId
            LIMIT 1
          )`,
          'userVotedOptionId',
        )

        .addSelect(
          `(
            SELECT pv."optionId"
            FROM poll_votes pv
            WHERE pv."pollId" = sharedPoll.id AND pv."userId" = :userId
            LIMIT 1
          )`,
          'sharedUserVotedOptionId',
        )

        .setParameter('userId', userId)

        .groupBy('post.id')
        .addGroupBy('createdBy.id')
        .addGroupBy('media.id')
        .addGroupBy('candidate.id')
        .addGroupBy('company.id')
        .addGroupBy('sharedPost.id')
        .addGroupBy('sharedCreatedBy.id')
        .addGroupBy('sharedCandidate.id')
        .addGroupBy('sharedCompany.id')
        .addGroupBy('sharedMedia.id')
        .addGroupBy('sharedBlog.id')
        .addGroupBy('sharedBlogCategory.id')
        .addGroupBy('nestedSharedBlog.id')
        .addGroupBy('nestedSharedBlogCategory.id')
        .addGroupBy('poll.id')
        .addGroupBy('pollOption.id')
        .addGroupBy('sharedPoll.id')
        .addGroupBy('sharedPollOption.id');

      qb.andWhere('createdBy.status != :banStatus', { banStatus: 'BAN' });

      if (![UserRoles.SUPER_ADMIN, UserRoles.MODERATOR].includes(userRole)) {
        qb.andWhere(
          `(post.status = :published OR (post.status IN (:...ownVisibleStatuses) AND createdBy.id = :userId))`,
          {
            published: 'PUBLISHED',
            ownVisibleStatuses: ['UNDER_REVIEW', 'PUBLISHED'],
            userId,
          },
        );
      }

      if (search) {
        qb.andWhere(`(LOWER(post.title) LIKE :search OR LOWER(post.description) LIKE :search)`, {
          search: `%${search.toLowerCase()}%`,
        });
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          if (!filters[field]) return;
          if (field === 'tag') {
            qb.andWhere(':tagFilter = ANY(post.tags)', {
              tagFilter: String(filters[field]).toLowerCase().replace(/^#/, ''),
            });
          } else {
            qb.andWhere(`post.${field} = :${field}`, {
              [field]: filters[field],
            });
          }
        });
      }

      qb.orderBy(`post.${sortBy}`, order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

      if (limit && page) {
        qb.skip((+page - 1) * +limit).take(+limit);
      }

      const { entities, raw } = await qb.getRawAndEntities();

      const data = entities.map((post, i) => {
        const userVotedOptionId = raw[i]?.userVotedOptionId || null;
        const sharedUserVotedOptionId = raw[i]?.sharedUserVotedOptionId || null;

        const sharedPost = post.sharedPost
          ? {
              ...post.sharedPost,
              poll: this.formatPoll((post.sharedPost as any).poll, sharedUserVotedOptionId),
            }
          : null;

        return {
          ...post,
          totalLikes: Number(raw[i]?.totalLikes) || 0,
          totalComments: Number(raw[i]?.totalComments) || 0,
          isOwnLike: raw[i]?.isOwnLike === true || raw[i]?.isOwnLike === 'true',
          isSaved: raw[i]?.isSaved === true || raw[i]?.isSaved === 'true',
          comments:
            typeof raw[i]?.twoComments === 'string'
              ? JSON.parse(raw[i].twoComments)
              : raw[i]?.twoComments || [],
          sharedPost,
          sharedBlog: post.sharedBlog || null,
          poll: this.formatPoll(post.poll, userVotedOptionId),
        };
      });

      const total = await qb.getCount();

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
}