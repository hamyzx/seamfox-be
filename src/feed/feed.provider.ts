import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PostRepository } from './repositories/post.repository';
import { PaginationDTO } from '../lib/dto/pagination.dto';
import { getMetaData } from '../lib/helpers/getMetaData';
import { findAllFeedQueryDto } from './dto/findAllFeedQuery.dto';
import { PostLikeRepository } from './repositories/post-like.repository';
import { PostCommentRepository } from './repositories/post-comment.repository';
import { PostSaveRepository } from './repositories/post-save.repository';
import { UserRoles, UserStatus } from '../lib/enums/user.enum';
import { UserProvider } from '../user/user.provider';
import { CreateCommentDto } from './dto/createComment.dto';
import { CreatePostDto } from './dto/createPost.dto';
import { MediaProvider } from '../media/media.provider';
import { FolderNames } from '../lib/enums/media.enum';
import { UpdatePostDto } from './dto/updatePost.dto';
import { GetAllFeedDto } from './dto/get-all-feed.dto';
import { PostMediaRepository } from './repositories/post-media.repository';
import { NotificationTypes } from '../lib/enums/notification.enum';
import { NotificationProvider } from '../notification/notification.provider';
import { PostComment } from './entities/post-comment.entity';
import { Post } from './entities/post.entity';
import { PostStatus } from '../lib/enums/post-visibility.enum';
import { DataSource } from 'typeorm';
import { PollRepository } from './repositories/poll.repository';
import { ModerationService } from '../moderation/moderation.service';

import { EmailService } from '../services/mail.service';
import {
  getPostFlaggedTemplate,
  getPostFlaggedText,
  getPostRejectedTemplate,
  getPostRejectedText,
  getContentFlaggedTemplate,
  getContentFlaggedText,
} from '../lib/templates/admin-alerts.template';


@Injectable()
export class FeedProvider {
  private readonly logger = new Logger(FeedProvider.name);

  constructor(
    private readonly postRepository: PostRepository,
    private readonly postLikeRepository: PostLikeRepository,
    private readonly postCommentRepository: PostCommentRepository,
    private readonly userProvider: UserProvider,
    private readonly mediaProvider: MediaProvider,
    private readonly postMediaRepository: PostMediaRepository,
    private readonly notificationProvider: NotificationProvider,
    private readonly pollRepository: PollRepository,
    private readonly dataSource: DataSource,
    private readonly moderationService: ModerationService,
    private readonly postSaveRepository: PostSaveRepository,
    private readonly emailService: EmailService,
  ) {}




  private extractHashtags(text: string): string[] {
    if (!text) return [];
    const regex = /#([a-zA-Z0-9_]{2,30})/g;
    const matches = [...text.matchAll(regex)];
    const tags = matches.map((m) => m[1].toLowerCase());
    return [...new Set(tags)].slice(0, 5);
  }

  private async safeNotify(params: {
    recipientId: string;
    senderId: string;
    senderName: string;
    type: NotificationTypes;
    title: string;
    body: string;
    postId: string;
    extraMetadata?: Record<string, any>;
  }) {
    try {
      if (params.recipientId === params.senderId) return;
      if (!params.recipientId) return;

      await this.notificationProvider.sendNotifications({
        recipientIds: [params.recipientId],
        senderId: params.senderId,
        senderName: params.senderName,
        type: params.type,
        notification: {
          title: params.title,
          body: params.body,
        },
        metadata: {
          postId: params.postId,
          type: params.type,
          ...(params.extraMetadata ?? {}),
        },
        dataPayload: {
          postId: params.postId,
          type: params.type,
          deepLink: `/candidate/forum?post=${params.postId}`,
        },
      });
    } catch (err: any) {
      this.logger.warn(
        `Notification dispatch failed (type=${params.type}, post=${params.postId}): ${err?.message ?? err}`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 Helper: Resolve candidate integer ID from user UUID
  //    Admin panel URL needs short integer (e.g. /admin/candidate/85),
  //    not the user's UUID. This bridges that gap safely.
  // ═══════════════════════════════════════════════════════════════════
  private async resolveCandidateIntegerId(userUuid: string): Promise<string> {
    if (!userUuid) return 'N/A';
    try {
      const rows: { id: number }[] = await this.dataSource.query(
        `SELECT id FROM "candidate" WHERE "userId" = $1 LIMIT 1`,
        [userUuid],
      );
      return rows?.[0]?.id != null ? String(rows[0].id) : 'N/A';
    } catch (err: any) {
      this.logger.warn(
        `[resolveCandidateIntegerId] Failed for user ${userUuid}: ${err?.message ?? err}`,
      );
      return 'N/A';
    }
  }
private async sendPostFlaggedEmail(post: Post): Promise<void> {
  try {
    const author = post.createdBy;

    if (!author?.email) {
      this.logger.warn(
        `[sendPostFlaggedEmail] Missing email for post ${post.id}`,
      );
      return;
    }

    const firstName =
      (author as any).candidate?.firstName ||
      author.firstName ||
      'there';

    await this.emailService.send({
      to: author.email,

      subject: 'Your post is under review',

      html: getPostFlaggedTemplate({
        firstName,
      }),

      text: getPostFlaggedText({
        firstName,
      }),
    });

    this.logger.log(
      `[sendPostFlaggedEmail] Email sent to ${author.email}`,
    );

  } catch (error: any) {
    this.logger.error(
      `[sendPostFlaggedEmail] Failed ${error?.message}`,
    );
  }
}


private async sendPostRejectedEmail(
  post: Post,
  adminReason?: string,
): Promise<void> {
  try {
    const author = post.createdBy;

    if (!author?.email) {
      this.logger.warn(
        `[sendPostRejectedEmail] Missing email for post ${post.id}`,
      );
      return;
    }

    const firstName =
      (author as any).candidate?.firstName ||
      author.firstName ||
      'there';

    await this.emailService.send({
      to: author.email,

      subject: 'Your post was not approved',

      html: getPostRejectedTemplate({
        firstName,
        adminReason,
      }),

      text: getPostRejectedText({
        firstName,
        adminReason,
      }),
    });

    this.logger.log(
      `[sendPostRejectedEmail] Email sent to ${author.email}`,
    );

  } catch (error: any) {
    this.logger.error(
      `[sendPostRejectedEmail] Failed ${error?.message}`,
    );
  }
}


  private async notifyAdminsAboutFlaggedContent(
    post: Post,
    flagReason: string,
  ): Promise<void> {
    try {
      const admins: { email: string }[] = await this.dataSource.query(
        `
        SELECT u.email
        FROM "users" u
        WHERE u.role = $1
          AND u.email IS NOT NULL
          AND u.email != ''
          AND u.status = 'ACTIVE'
        `,
        [UserRoles.SUPER_ADMIN],
      );

      const allRecipients = Array.from(
        new Set([...admins.map((a) => a.email), 'support@seamfox.com']),
      );

      if (!allRecipients.length) {
        this.logger.warn('[notifyAdminsAboutFlaggedContent] No recipients');
        return;
      }

      const author = post.createdBy;
      const memberName =
        `${(author as any).candidate?.firstName ?? author?.firstName ?? ''} ${
          (author as any).candidate?.lastName ?? author?.lastName ?? ''
        }`.trim() || 'Unknown';
      const memberEmail = author?.email || 'N/A';
      const contentSnippet = post.description || post.title || '(no text content)';
      const dateTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      // 🔥 Use candidate integer ID for admin URL (e.g. /admin/candidate/85)
      const candidateIntId = await this.resolveCandidateIntegerId(author?.id || '');

      this.logger.log(
        `[notifyAdminsAboutFlaggedContent] Sending alert to ${allRecipients.length} recipients for post ${post.id} (candidateId=${candidateIntId})`,
      );

      await Promise.allSettled(
        allRecipients.map((email) =>
          this.emailService.send({
            to: email,
            subject: 'Content Flagged — Action Required',
            html: getContentFlaggedTemplate({
              memberName,
              memberEmail,
              contentType: 'Post',
              contentSnippet,
              flagReason,
              dateTime,
              userId: candidateIntId, // 🔥 admin URL ID, not the user UUID
              contentId: post.id,
            }),
            text: getContentFlaggedText({
              memberName,
              memberEmail,
              contentType: 'Post',
              contentSnippet,
              flagReason,
              dateTime,
              userId: candidateIntId,
              contentId: post.id,
            }),
          }),
        ),
      );

      this.logger.log('[notifyAdminsAboutFlaggedContent] ✅ Admin alerts sent');
    } catch (err: any) {
      this.logger.warn(
        `[notifyAdminsAboutFlaggedContent] Failed: ${err?.message ?? err}`,
      );
    }
  }

  private async notifyAdminsAboutFlaggedComment(params: {
    author: { id?: string; firstName?: string; lastName?: string; email?: string } & any;
    commentText: string;
    postId: string;
    flagReason: string;
  }): Promise<void> {
    try {
      const { author, commentText, postId, flagReason } = params;

      const admins: { email: string }[] = await this.dataSource.query(
        `
        SELECT u.email
        FROM "users" u
        WHERE u.role = $1
          AND u.email IS NOT NULL
          AND u.email != ''
          AND u.status = 'ACTIVE'
        `,
        [UserRoles.SUPER_ADMIN],
      );

      const allRecipients = Array.from(
        new Set([...admins.map((a) => a.email), 'support@seamfox.com']),
      );

      if (!allRecipients.length) {
        this.logger.warn('[notifyAdminsAboutFlaggedComment] No recipients');
        return;
      }

      const memberName =
        `${(author as any)?.candidate?.firstName ?? author?.firstName ?? ''} ${
          (author as any)?.candidate?.lastName ?? author?.lastName ?? ''
        }`.trim() || 'Unknown';
      const memberEmail = author?.email || 'N/A';
      const contentSnippet = commentText || '(empty)';
      const dateTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      // 🔥 Resolve candidate integer ID for admin URL
      const candidateIntId = await this.resolveCandidateIntegerId(author?.id || '');

      this.logger.log(
        `[notifyAdminsAboutFlaggedComment] Sending alert to ${allRecipients.length} recipients (post ${postId}, candidateId=${candidateIntId})`,
      );

      await Promise.allSettled(
        allRecipients.map((email) =>
          this.emailService.send({
            to: email,
            subject: 'Content Flagged — Action Required',
            html: getContentFlaggedTemplate({
              memberName,
              memberEmail,
              contentType: 'Comment',
              contentSnippet,
              flagReason,
              dateTime,
              userId: candidateIntId, // 🔥 admin URL ID
              contentId: postId,
            }),
            text: getContentFlaggedText({
              memberName,
              memberEmail,
              contentType: 'Comment',
              contentSnippet,
              flagReason,
              dateTime,
              userId: candidateIntId,
              contentId: postId,
            }),
          }),
        ),
      );

      this.logger.log('[notifyAdminsAboutFlaggedComment] ✅ Admin alerts sent');
    } catch (err: any) {
      this.logger.warn(
        `[notifyAdminsAboutFlaggedComment] Failed: ${err?.message ?? err}`,
      );
    }
  }

  async createPost(payload: CreatePostDto, createdById: string) {
    const user = await this.userProvider.findOne(createdById);
    if (!user) throw new NotFoundException('User not found');

    if (user.status === UserStatus.BAN) {
      throw new BadRequestException(`You are banned from forum`);
    }

    if (
      !payload.title &&
      !payload.description &&
      !payload.sharedPostId &&
      !payload.sharedBlogId
    ) {
      throw new BadRequestException(
        'Post must have a title, description, share, or article reference',
      );
    }

    let sharedPost: Post | undefined = undefined;

    if (payload.sharedPostId) {
      const foundPost = await this.postRepository.findOne(payload.sharedPostId);
      if (!foundPost) throw new BadRequestException('Shared post not found');
      sharedPost = foundPost.sharedPost ?? foundPost;

      await this.postRepository.update({
        id: sharedPost.id,
        totalShares: (sharedPost.totalShares || 0) + 1,
      });
    }

    let sharedBlog: any = null;
    if (payload.sharedBlogId) {
      sharedBlog = await this.dataSource
        .createQueryBuilder()
        .select('blog')
        .from('blogs', 'blog')
        .where('blog.id = :id', { id: payload.sharedBlogId })
        .andWhere('blog.status = :status', { status: 'PUBLISHED' })
        .getRawOne();

      if (!sharedBlog) {
        throw new BadRequestException('Article not found or not published');
      }
    }

    const rawMedia = payload.media ?? [];
    const processedMedia = await Promise.all(
      rawMedia.map(async (m) => {
        const movedKey = await this.mediaProvider.moveFile(FolderNames.FEED, m.mediaUrl);
        return { mediaUrl: movedKey, mediaType: m.mediaType };
      }),
    );

    const fromDescription = this.extractHashtags(payload.description || '');
    const explicitTags = (payload.tags || []).map((t) =>
      t.toLowerCase().replace(/^#/, '').slice(0, 30),
    );
    const mergedTags = [...new Set([...fromDescription, ...explicitTags])].slice(0, 5);

    const {
      media,
      sharedPostId,
      sharedBlogId,
      poll: pollPayload,
      tags: _,
      ...postData
    } = payload;

    const contentParts = [postData.title, postData.description].filter(Boolean);

    if (pollPayload?.question) {
      contentParts.push(pollPayload.question);
      if (pollPayload.options?.length) {
        pollPayload.options.forEach((opt) => {
          if (opt.text) contentParts.push(opt.text);
        });
      }
    }

    const contentToModerate = contentParts.join(' ');
    const moderationResult = contentToModerate
      ? await this.moderationService.moderateContent(contentToModerate)
      : { status: PostStatus.PUBLISHED, reason: undefined, score: undefined, flagged: false };

    const newPost = await this.postRepository.create({
      ...postData,
      title: payload.title || undefined,
      description: payload.description || '',
      status: moderationResult.status,
      moderationReason: moderationResult.reason,
      moderationScore: moderationResult.score,
      tags: mergedTags,
      createdBy: user,
      media: processedMedia,
      ...(sharedPost ? { sharedPost } : {}),
      ...(sharedBlogId ? { sharedBlogId } : {}),
    });

    if (pollPayload) {
      try {
        await this.pollRepository.createPollForPost(newPost, pollPayload);
      } catch (err: any) {
        this.logger.warn(`Poll creation failed for post ${newPost.id}: ${err?.message}`);
      }
    }

    if (sharedPost && sharedPost.createdBy?.id) {
      const sharerName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Someone';
      await this.safeNotify({
        recipientId: sharedPost.createdBy.id,
        senderId: user.id,
        senderName: sharerName,
        type: NotificationTypes.SHARE_CONTENT,
        title: 'Your post was shared',
        body: `${sharerName} shared your post`,
        postId: sharedPost.id,
        extraMetadata: { sharedByPostId: newPost.id },
      });
    }

    if (moderationResult.flagged && newPost.status === PostStatus.UNDER_REVIEW) {
      const postWithAuthor = await this.postRepository.findOne(newPost.id);
      if (postWithAuthor) {
        this.sendPostFlaggedEmail(postWithAuthor).catch((err) =>
          this.logger.warn(`[createPost] Flagged email failed: ${err?.message}`),
        );
        this.notifyAdminsAboutFlaggedContent(
          postWithAuthor,
          moderationResult.reason || 'Content auto-flagged by moderation system',
        ).catch((err) =>
          this.logger.warn(`[createPost] Admin alert failed: ${err?.message}`),
        );
      }
    }

    return newPost;
  }

  async updatePost(postId: string, payload: UpdatePostDto, updatedById: string, role: string) {
    const post = await this.postRepository.findOne(postId);
    if (!post) throw new NotFoundException('We could not find this post.');

    const oldStatusSnapshot = post.status;

    const canEditAnyPost = [
      UserRoles.SUPER_ADMIN.toString(),
      UserRoles.MODERATOR.toString(),
    ].includes(role);

    if (!canEditAnyPost) {
      if (post.createdBy?.id !== updatedById) {
        throw new ForbiddenException('You can only edit your own post.');
      }
    }

    const { media: incomingMedia, tags: incomingTags, ...postFields } = payload;

    const needsRemoderation =
      postFields.description !== undefined || postFields.title !== undefined;

    if (needsRemoderation) {
      const contentParts = [
        postFields.title ?? post.title,
        postFields.description ?? post.description,
      ].filter(Boolean);

      const contentToModerate = contentParts.join(' ');
      const moderationResult = await this.moderationService.moderateContent(contentToModerate);

      if (moderationResult.flagged) {
        (postFields as any).status = PostStatus.UNDER_REVIEW;
        (postFields as any).moderationReason = moderationResult.reason;
        (postFields as any).moderationScore = moderationResult.score;
      } else {
        if (post.status === PostStatus.UNDER_REVIEW) {
          (postFields as any).status = PostStatus.PUBLISHED;
          (postFields as any).moderationReason = null;
          (postFields as any).moderationScore = null;
        }
      }
    }

    if (postFields.description !== undefined) {
      const fromDescription = this.extractHashtags(postFields.description);
      const explicitTags = (incomingTags || []).map((t) =>
        t.toLowerCase().replace(/^#/, '').slice(0, 30),
      );
      const mergedTags = [...new Set([...fromDescription, ...explicitTags])].slice(0, 5);
      (postFields as any).tags = mergedTags;
    } else if (incomingTags !== undefined) {
      (postFields as any).tags = incomingTags
        .map((t) => t.toLowerCase().replace(/^#/, '').slice(0, 30))
        .slice(0, 5);
    }

    this.postRepository.merge(post, postFields);

    if (Array.isArray(incomingMedia)) {
      await this.postMediaRepository.remove(postId);
      const newMedia = await Promise.all(
        incomingMedia.map(async (m) => {
          const finalKey = await this.mediaProvider.moveFile(FolderNames.FEED, m.mediaUrl!);
          return {
            post: { id: post.id },
            mediaUrl: finalKey!,
            mediaType: m.mediaType!,
          };
        }),
      );
      await this.postMediaRepository.saveMany(newMedia);
    }

    const newStatus = (postFields as any).status ?? post.status;
    const adminReason =
      (payload as any).adminReason || (payload as any).moderationReason;

    const updated = await this.postRepository.update(post);

    const isAdminAction = [
      UserRoles.SUPER_ADMIN.toString(),
      UserRoles.MODERATOR.toString(),
    ].includes(role);

    if (isAdminAction && newStatus !== oldStatusSnapshot) {
      this.logger.log(
        `[updatePost] Status change by admin: ${oldStatusSnapshot} → ${newStatus} for post ${postId}`,
      );

      const postWithAuthor = await this.postRepository.findOne(postId);
      if (postWithAuthor) {
        if (newStatus === PostStatus.UNDER_REVIEW) {
          this.sendPostFlaggedEmail(postWithAuthor).catch((err) =>
            this.logger.warn(`[updatePost] Flagged email failed: ${err?.message}`),
          );
        } else if (newStatus === PostStatus.REJECTED) {
          this.sendPostRejectedEmail(postWithAuthor, adminReason).catch((err) =>
            this.logger.warn(`[updatePost] Rejected email failed: ${err?.message}`),
          );
        }
      }
    }

    return updated;
  }

  async deletePost(postId: string, requesterId: string, userRole: UserRoles) {
    const post = await this.postRepository.findOne(postId);
    if (!post) throw new NotFoundException('We could not find this post.');
    if (userRole !== UserRoles.SUPER_ADMIN && post.createdBy?.id !== requesterId)
      throw new ForbiddenException('You can only delete your own post.');

    await this.postMediaRepository.remove(postId);
    await this.postRepository.remove(postId);

    return 'Your post has been deleted successfully.';
  }

  async findAll(query: GetAllFeedDto, userId: number) {
    const user = await this.userProvider.findOne(`${userId}`);
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.BAN) throw new NotFoundException('You are banned from forum.');

    return this.postRepository.findAllPost(query, userId, user.role);
  }

  async getFollowingFeed(query: GetAllFeedDto, userId: string) {
    const user = await this.userProvider.findOne(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.BAN) throw new NotFoundException('You are banned from forum.');

    return this.postRepository.findFollowingFeed(query, userId);
  }

  async findPostLikes(requesterId: string, postId: string, qParams: PaginationDTO) {
    const { page, limit } = qParams;
    const skip = (page - 1) * limit;

    const [rows, total] = await this.postLikeRepository.findPostLikes(postId, skip, limit);
    return {
      rows: rows.map((r) => ({ ...r, isOwnLike: r.user.id === requesterId })),
      meta: getMetaData(qParams, total),
    };
  }

  async findPostComments(requesterId: string, postId: string, qParams: PaginationDTO) {
    const { page, limit } = qParams;
    const skip = (page - 1) * limit;

    const [rows, total] = await this.postCommentRepository.findPostComments(postId, skip, limit);
    return {
      rows: rows.map((r) => ({ ...r, isOwnComment: r.user.id === requesterId })),
      meta: getMetaData(qParams, total),
    };
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.postCommentRepository.findOneComment(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    const isAdmin = comment?.user.role === UserRoles.SUPER_ADMIN;
    const isOwn = comment?.user.id === userId;

    if (!isOwn && !isAdmin) {
      throw new BadRequestException(
        'Only the user itself or an administrator can delete this comment',
      );
    }

    const descendants: { id: string }[] = await this.dataSource.query(
      `
      WITH RECURSIVE comment_tree AS (
        SELECT id FROM post_comments WHERE id = $1
        UNION ALL
        SELECT c.id
        FROM post_comments c
        INNER JOIN comment_tree ct ON c."parentId" = ct.id
      )
      SELECT id FROM comment_tree
      `,
      [commentId],
    );

    const allIds = descendants.map((d) => d.id);

    if (allIds.length === 0) {
      await this.postCommentRepository.deleteComment(commentId);
      return 'Comment successfully deleted';
    }

    await this.dataSource.query(`DELETE FROM post_comments WHERE id = ANY($1::uuid[])`, [allIds]);

    return `Comment and ${allIds.length - 1} ${allIds.length - 1 === 1 ? 'reply' : 'replies'} successfully deleted`;
  }

  async toggleLike(userId: string, postId: string) {
    const user = await this.userProvider.findOne(userId);
    if (!user) throw new NotFoundException('user not found');
    const post = await this.postRepository.findOne(postId);
    if (!post) throw new NotFoundException('Post not found');

    const existingLike = await this.postLikeRepository.findOneLike(user.id, post.id);

    if (existingLike) {
      await this.postLikeRepository.removeLike(user.id, post.id);
      return 'Like removed';
    }

    await this.postLikeRepository.createLike(user, post);

    if (post.createdBy?.id) {
      const likerName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Someone';
      await this.safeNotify({
        recipientId: post.createdBy.id,
        senderId: user.id,
        senderName: likerName,
        type: NotificationTypes.LIKE_CONTENT,
        title: 'New like on your post',
        body: `${likerName} liked your post`,
        postId: post.id,
      });
    }

    return 'Successfully liked';
  }

  async createComment(payload: CreateCommentDto, createdBy: string) {
    const post = await this.postRepository.findOne(payload.postId);
    if (!post) throw new BadRequestException('Post does not exist');

    const user = await this.userProvider.findOne(createdBy);
    if (!user) throw new BadRequestException('User does not exist');

    const moderationResult = await this.moderationService.moderateContent(payload.comment);

    if (moderationResult.flagged) {
      this.logger.log(
        `[createComment] Flagged comment detected from user ${user.id} on post ${post.id}`,
      );

      this.notifyAdminsAboutFlaggedComment({
        author: user,
        commentText: payload.comment,
        postId: post.id,
        flagReason:
          moderationResult.reason || 'Comment auto-flagged by moderation system',
      }).catch((err) =>
        this.logger.warn(`[createComment] Admin alert failed: ${err?.message}`),
      );

      throw new BadRequestException('Your comment contains inappropriate content');
    }

    let parentComment: PostComment | null = null;

    if (payload.parentId) {
      parentComment = await this.postCommentRepository.findOneComment(payload.parentId);
      if (!parentComment) throw new BadRequestException('Parent comment not found');
    }

    const comment = await this.postCommentRepository.createComment({
      comment: payload.comment,
      user,
      post,
      ...(parentComment ? { parent: parentComment } : {}),
    });

    const newComment = await this.postCommentRepository.findOneComment(comment.id);
    if (!newComment) throw new NotFoundException('Comment not found');

    const commenterName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Someone';
    const commentSnippet =
      payload.comment.length > 80 ? `${payload.comment.slice(0, 80)}…` : payload.comment;

    if (parentComment) {
      const parentAuthorId = parentComment.user?.id;
      if (parentAuthorId) {
        await this.safeNotify({
          recipientId: parentAuthorId,
          senderId: user.id,
          senderName: commenterName,
          type: NotificationTypes.REPLY,
          title: 'New reply to your comment',
          body: `${commenterName} replied: ${commentSnippet}`,
          postId: post.id,
          extraMetadata: {
            commentId: newComment.id,
            parentCommentId: parentComment.id,
          },
        });
      }

      if (
        post.createdBy?.id &&
        post.createdBy.id !== user.id &&
        post.createdBy.id !== parentAuthorId
      ) {
        await this.safeNotify({
          recipientId: post.createdBy.id,
          senderId: user.id,
          senderName: commenterName,
          type: NotificationTypes.COMMENT,
          title: 'New activity on your post',
          body: `${commenterName} replied on your post`,
          postId: post.id,
          extraMetadata: { commentId: newComment.id },
        });
      }
    } else {
      if (post.createdBy?.id) {
        await this.safeNotify({
          recipientId: post.createdBy.id,
          senderId: user.id,
          senderName: commenterName,
          type: NotificationTypes.COMMENT,
          title: 'New comment on your post',
          body: `${commenterName} commented: ${commentSnippet}`,
          postId: post.id,
          extraMetadata: { commentId: newComment.id },
        });
      }
    }

    return {
      ...newComment,
      isOwnComment: newComment.user.id === createdBy,
    };
  }

  async updateComment(userId: string, commentId: string, text: string) {
    const comment = await this.postCommentRepository.findOneComment(commentId);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.user.id !== userId) {
      throw new ForbiddenException('You can only edit your own comment');
    }

    const moderationResult = await this.moderationService.moderateContent(text);

    if (moderationResult.flagged) {
      this.logger.log(
        `[updateComment] Flagged comment edit by user ${userId} on comment ${commentId}`,
      );

      this.notifyAdminsAboutFlaggedComment({
        author: comment.user,
        commentText: text,
        postId: (comment as any).post?.id || 'N/A',
        flagReason:
          moderationResult.reason || 'Comment edit auto-flagged by moderation system',
      }).catch((err) =>
        this.logger.warn(`[updateComment] Admin alert failed: ${err?.message}`),
      );

      throw new BadRequestException('Your comment contains inappropriate content');
    }

    comment.comment = text;
    return await this.postCommentRepository.updateComment(comment);
  }

  async getPoll(postId: string, userId: string) {
    const poll = await this.pollRepository.findByPostId(postId);
    if (!poll) throw new NotFoundException('No poll on this post');

    const userVote = await this.pollRepository.findUserVote(poll.id, userId);

    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();

    return {
      id: poll.id,
      question: poll.question,
      expiresAt: poll.expiresAt,
      isExpired,
      totalVotes: poll.totalVotes,
      userVotedOptionId: userVote?.option?.id ?? null,
      options: poll.options
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((opt) => ({
          id: opt.id,
          text: opt.text,
          voteCount: opt.voteCount,
          percentage: poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0,
        })),
    };
  }

  async votePoll(postId: string, userId: string, optionId: string) {
    const poll = await this.pollRepository.findByPostId(postId);
    if (!poll) throw new NotFoundException('No poll on this post');

    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      throw new BadRequestException('This poll has ended');
    }

    const optionExists = poll.options.find((o) => o.id === optionId);
    if (!optionExists) throw new BadRequestException('Invalid option');

    const existingVote = await this.pollRepository.findUserVote(poll.id, userId);
    if (existingVote) {
      throw new BadRequestException('You have already voted on this poll');
    }

    await this.pollRepository.castVote(poll.id, optionId, userId);
    return this.getPoll(postId, userId);
  }

  async unvotePoll(postId: string, userId: string) {
    const poll = await this.pollRepository.findByPostId(postId);
    if (!poll) throw new NotFoundException('No poll on this post');

    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
      throw new BadRequestException('This poll has ended');
    }

    await this.pollRepository.removeVote(poll.id, userId);
    return this.getPoll(postId, userId);
  }

  async getTrendingTags(limit = 20) {
    try {
      const rows: { tag: string; count: string }[] = await this.dataSource.query(
        `
        SELECT tag, COUNT(*)::int AS count
        FROM (
          SELECT unnest(tags) AS tag
          FROM posts
          WHERE status = 'PUBLISHED'
            AND "deletedAt" IS NULL
            AND tags IS NOT NULL
            AND array_length(tags, 1) > 0
        ) AS expanded_tags
        WHERE tag IS NOT NULL AND length(tag) > 0
        GROUP BY tag
        ORDER BY count DESC, tag ASC
        LIMIT $1
        `,
        [limit],
      );

      return rows.map((r) => ({
        tag: r.tag,
        count: Number(r.count) || 0,
      }));
    } catch (err: any) {
      this.logger.warn(`getTrendingTags failed: ${err?.message ?? err}`);
      return [];
    }
  }

  async getMyUsedTags(userId: string, limit = 15) {
    try {
      const rows: { tag: string; count: string; lastUsed: string }[] = await this.dataSource.query(
        `
          SELECT 
            tag, 
            COUNT(*)::int AS count,
            MAX("createdAt") AS "lastUsed"
          FROM (
            SELECT unnest(tags) AS tag, "createdAt"
            FROM posts
            WHERE "createdBy" = $1
              AND "deletedAt" IS NULL
              AND tags IS NOT NULL
              AND array_length(tags, 1) > 0
          ) AS expanded_tags
          WHERE tag IS NOT NULL AND length(tag) > 0
          GROUP BY tag
          ORDER BY "lastUsed" DESC, count DESC, tag ASC
          LIMIT $2
          `,
        [userId, limit],
      );

      return rows.map((r) => ({
        tag: r.tag,
        count: Number(r.count) || 0,
        lastUsed: r.lastUsed,
      }));
    } catch (err: any) {
      this.logger.warn(`getMyUsedTags failed: ${err?.message ?? err}`);
      return [];
    }
  }

  async searchNexus(query: string, limit = 5) {
    if (!query || query.trim().length < 2) {
      return { posts: [], hashtags: [], users: [] };
    }

    const cleanQuery = query.trim().replace(/^#/, '').toLowerCase();
    const searchPattern = `%${cleanQuery}%`;

    try {
      const posts = await this.dataSource.query(
        `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.tags,
        p."createdAt",
        (SELECT COUNT(*) FROM post_likes pl WHERE pl."postId" = p.id) AS "totalLikes",
        (SELECT COUNT(*) FROM post_comments pc WHERE pc."postId" = p.id) AS "totalComments",
        u.id AS "userId",
        u.role AS "userRole",
        u."firstName" AS "userFirstName",
        u."lastName" AS "userLastName",
        u."profileImg" AS "userProfileImg",
        c.id AS "candidateId",
        c."firstName" AS "candidateFirstName",
        c."lastName" AS "candidateLastName",
        c."profileImage" AS "candidateProfileImage",
        comp.id AS "companyId",
        comp."name" AS "companyName",
        comp."logo" AS "companyLogo"
      FROM posts p
      LEFT JOIN "users" u ON u.id = p."createdBy"
      LEFT JOIN "candidate" c ON c."userId" = u.id
      LEFT JOIN "company" comp ON comp."userId" = u.id
      WHERE 
        p."deletedAt" IS NULL
        AND p.status = 'PUBLISHED'
        AND (
          LOWER(COALESCE(p.title, '')) LIKE $1
          OR LOWER(COALESCE(p.description, '')) LIKE $1
        )
      ORDER BY p."createdAt" DESC
      LIMIT $2
      `,
        [searchPattern, limit],
      );

      const formattedPosts = posts.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        tags: p.tags || [],
        createdAt: p.createdAt,
        totalLikes: parseInt(p.totalLikes, 10) || 0,
        totalComments: parseInt(p.totalComments, 10) || 0,
        createdBy: {
          id: p.userId,
          role: p.userRole,
          firstName: p.userFirstName,
          lastName: p.userLastName,
          profileImg: p.userProfileImg,
          candidate: p.candidateId
            ? {
                id: p.candidateId,
                firstName: p.candidateFirstName,
                lastName: p.candidateLastName,
                profileImage: p.candidateProfileImage,
              }
            : null,
          company: p.companyId
            ? {
                id: p.companyId,
                name: p.companyName,
                logo: p.companyLogo,
              }
            : null,
        },
      }));

      const hashtags = await this.dataSource.query(
        `
      SELECT 
        tag,
        COUNT(*) as "postCount"
      FROM (
        SELECT UNNEST(tags) AS tag
        FROM posts
        WHERE 
          "deletedAt" IS NULL 
          AND tags IS NOT NULL 
          AND array_length(tags, 1) > 0
      ) tag_list
      WHERE LOWER(tag) LIKE $1
      GROUP BY tag
      ORDER BY "postCount" DESC, tag ASC
      LIMIT $2
      `,
        [searchPattern, limit],
      );

      const users = await this.dataSource.query(
        `
      SELECT 
        u.id,
        u.role,
        u."firstName" AS "uFirstName",
        u."lastName" AS "uLastName",
        u."profileImg" AS "uProfileImg",
        u.email,
        c.id AS "candidateId",
        c."firstName" AS "cFirstName",
        c."lastName" AS "cLastName",
        c."profileImage" AS "cProfileImage",
        comp.id AS "companyId",
        comp."name" AS "companyName",
        comp."logo" AS "companyLogo"
      FROM "users" u
      LEFT JOIN "candidate" c ON c."userId" = u.id
      LEFT JOIN "company" comp ON comp."userId" = u.id
      WHERE 
        LOWER(COALESCE(u."firstName", '')) LIKE $1
        OR LOWER(COALESCE(u."lastName", '')) LIKE $1
        OR LOWER(COALESCE(c."firstName", '')) LIKE $1
        OR LOWER(COALESCE(c."lastName", '')) LIKE $1
        OR LOWER(COALESCE(comp."name", '')) LIKE $1
      LIMIT $2
      `,
        [searchPattern, limit],
      );

      const formattedUsers = users.map((u: any) => ({
        id: u.id,
        role: u.role,
        firstName:
          u.cFirstName || u.uFirstName || (u.companyName ? u.companyName.split(' ')[0] : ''),
        lastName:
          u.cLastName ||
          u.uLastName ||
          (u.companyName ? u.companyName.split(' ').slice(1).join(' ') : ''),
        profileImg: u.cProfileImage || u.companyLogo || u.uProfileImg || null,
        email: u.email,
      }));

      return {
        posts: formattedPosts,
        hashtags: (hashtags || []).map((h: any) => ({
          tag: h.tag,
          count: parseInt(h.postCount, 10) || 0,
        })),
        users: formattedUsers,
      };
    } catch (error) {
      console.error('[searchNexus] SQL Error:', error);
      throw error;
    }
  }

  async toggleSave(userId: string, postId: string) {
    const user = await this.userProvider.findOne(userId);
    if (!user) throw new NotFoundException('User not found');
    const post = await this.postRepository.findOne(postId);
    if (!post) throw new NotFoundException('Post not found');

    const existingSave = await this.postSaveRepository.findOneSave(userId, postId);

    if (existingSave) {
      await this.postSaveRepository.removeSave(userId, postId);
      return { message: 'Post unsaved', isSaved: false };
    }

    await this.postSaveRepository.createSave(userId, postId);
    return { message: 'Post saved', isSaved: true };
  }

  async getSavedPosts(query: GetAllFeedDto, userId: string) {
    const user = await this.userProvider.findOne(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.BAN) throw new NotFoundException('You are banned from forum.');

    const { page = 1, limit = 10 } = query;

    try {
      this.logger.log(`[getSavedPosts] Fetching saved posts for userId: ${userId}`);

      const savedPostIds = await this.dataSource
        .createQueryBuilder()
        .select('save."postId"', 'postId')
        .addSelect('save."createdAt"', 'savedAt')
        .from('post_saves', 'save')
        .where('save."userId" = :userId', { userId })
        .orderBy('save."createdAt"', 'DESC')
        .getRawMany();

      this.logger.log(`[getSavedPosts] Found ${savedPostIds.length} saved post IDs`);

      const postIds = savedPostIds.map((s) => s.postId);

      if (postIds.length === 0) {
        return { data: [], total: 0, page: +page, limit: +limit };
      }

      const qb = this.dataSource
        .getRepository(Post)
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
        .leftJoin('post.likes', 'likes')
        .innerJoin('post_saves', 'save', 'save."postId" = post.id')
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
          `CASE
            WHEN EXISTS (
              SELECT 1 FROM post_likes l
              WHERE l."postId" = post.id AND l."userId" = :userId AND l."deletedAt" IS NULL
            )
            THEN true ELSE false
          END`,
          'isOwnLike',
        )
        .addSelect('true', 'isSaved')
        .addSelect(
          `(
            SELECT pv."optionId"
            FROM poll_votes pv
            WHERE pv."pollId" = poll.id AND pv."userId" = :userId
            LIMIT 1
          )`,
          'userVotedOptionId',
        )
        .where('save."userId" = :userId', { userId })
        .andWhere('post.id IN (:...postIds)', { postIds })
        .andWhere('post."deletedAt" IS NULL')
        .andWhere('post.status = :published', { published: 'PUBLISHED' })
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
        .skip((+page - 1) * +limit)
        .take(+limit);

      const { entities, raw } = await qb.getRawAndEntities();

      this.logger.log(`[getSavedPosts] Query returned ${entities.length} posts`);

      const data = entities.map((post: any, i: number) => {
        const userVotedOptionId = raw[i]?.userVotedOptionId || null;
        const isExpired = post.poll?.expiresAt ? new Date(post.poll.expiresAt) < new Date() : false;

        return {
          ...post,
          totalLikes: Number(raw[i]?.totalLikes) || 0,
          totalComments: Number(raw[i]?.totalComments) || 0,
          isOwnLike: raw[i]?.isOwnLike === true || raw[i]?.isOwnLike === 'true',
          isSaved: true,
          poll: post.poll
            ? {
                id: post.poll.id,
                question: post.poll.question,
                expiresAt: post.poll.expiresAt,
                isExpired,
                totalVotes: post.poll.totalVotes,
                userVotedOptionId,
                options: (post.poll.options || [])
                  .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                  .map((opt: any) => ({
                    id: opt.id,
                    text: opt.text,
                    voteCount: opt.voteCount,
                    percentage:
                      post.poll.totalVotes > 0
                        ? Math.round((opt.voteCount / post.poll.totalVotes) * 100)
                        : 0,
                  })),
              }
            : null,
        };
      });

      const orderMap = new Map(postIds.map((id, idx) => [id, idx]));
      data.sort((a: any, b: any) => {
        const aIdx = orderMap.get(a.id) ?? 999999;
        const bIdx = orderMap.get(b.id) ?? 999999;
        return aIdx - bIdx;
      });

      const total = postIds.length;
      return { data, total, page: +page, limit: +limit };
    } catch (error) {
      this.logger.error('getSavedPosts failed:', error);
      throw error;
    }
  }
}