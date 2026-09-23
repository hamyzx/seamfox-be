import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Repository, DataSource } from 'typeorm';
import { Blog } from './entities/blog.entity';
import { BlogCategory } from './entities/blog-category.entity';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { MediaProvider } from '../media/media.provider';
import { FolderNames } from '../lib/enums/media.enum';
import { GetAllBlogDto } from './dto/get-all-blogs.dto';
import { BlogStatus } from '../lib/enums/blog-status.enum';
import { handleDBError } from '../lib/error/dataBaseError';
import { EmailService } from '../services/mail.service';
import { ConfigService } from '@nestjs/config';
import { UserRoles, UserStatus } from '../lib/enums/user.enum';
import { BlogRead } from './entities/blog-read.entity';
import {
  getFridayFoxTemplate,
  getFridayFoxText,
  getNewInsightsTemplate,
  getNewInsightsText,
} from '../lib/templates/nexus.template';

import { BLOG_EMAIL_QUEUE, BlogEmailJobData } from './blog-email.processor';

export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    @InjectRepository(Blog)
    private blogRepo: Repository<Blog>,

    @InjectRepository(BlogRead)
    private blogReadRepo: Repository<BlogRead>,

    @InjectRepository(BlogCategory)
    private categoryRepo: Repository<BlogCategory>,

    private mediaProvider: MediaProvider,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,

    @InjectQueue(BLOG_EMAIL_QUEUE)
    private readonly blogEmailQueue: Queue<BlogEmailJobData>,
  ) { }

  private async notifyAllCandidatesAboutArticle(blog: Blog): Promise<void> {
    try {
      const recipients: {
        id: string;
        email: string;
        firstName: string;
      }[] = await this.dataSource.query(
        `
          SELECT
            u.id,
            u.email,
            COALESCE(
              NULLIF(c."firstName", ''),
              NULLIF(co."name", ''),
              ''
            ) AS "firstName"
          FROM "users" u
          LEFT JOIN "candidate" c ON c."userId" = u.id
          LEFT JOIN "company" co ON co."userId" = u.id
          WHERE u.role IN ($1, $2)
            AND u.status != $3
            AND u.email IS NOT NULL
            AND u.email != ''
            AND u."marketingOptIn" = true
          `,
        [UserRoles.CANDIDATE, UserRoles.COMPANY, UserStatus.BAN],
      );

      if (!recipients.length) {
        this.logger.warn('[notifyAllRecipients] No opted-in recipients found');
        return;
      }

      const isFridayFox = blog.isAiGenerated === true;
      const articleType = isFridayFox ? 'Friday Fox' : 'Insights';

      const articleTitle = blog.title;
      const shortDescription =
        blog.shortDescription || 'Read the full article on Seamfox Insights.';
      const articleId = (blog as any).slug || blog.id;
      const badge = blog.category?.name || 'Insights';
      const readTime = this.parseReadTime(blog.readTime);

      const subject = isFridayFox
        ? `🦊 The Friday Fox is here — ${articleTitle}`
        : `📰 New on Fox Insights — ${articleTitle}`;

      const jobs = recipients.map((recipient) => {
        const firstName = recipient.firstName || 'there';

        const html = isFridayFox
          ? getFridayFoxTemplate({
            firstName,
            articleTitle,
            shortDescription,
            articleId,
            userId: recipient.id,
          })
          : getNewInsightsTemplate({
            firstName,
            articleTitle,
            shortDescription,
            articleId,
            badge,
            readTime,
            userId: recipient.id,
          });

        const text = isFridayFox
          ? getFridayFoxText({
            firstName,
            articleTitle,
            shortDescription,
            articleId,
            userId: recipient.id,
          })
          : getNewInsightsText({
            firstName,
            articleTitle,
            shortDescription,
            articleId,
            badge,
            readTime,
            userId: recipient.id,
          });

        return {
          name: 'send-blog-email',
          data: {
            to: recipient.email,
            subject,
            html,
            text,
            blogId: blog.id,
            recipientName: firstName,
          } as BlogEmailJobData,
        };
      });

      await this.blogEmailQueue.addBulk(jobs);

      this.logger.log(
        `[notifyAllRecipients] ${articleType}: Queued ${jobs.length} emails for blog ${blog.id} ("${articleTitle}") — candidates + companies, opted-in only`,
      );

      await this.blogRepo.update(blog.id, {
        notificationSentAt: new Date(),
      });
    } catch (err: any) {
      this.logger.error(
        `[notifyAllRecipients] Failed to queue for blog ${blog.id}: ${err?.message ?? err}`,
      );
    }
  }

  private parseReadTime(readTime: any): number {
    if (!readTime) return 5;
    if (typeof readTime === 'number') return readTime;
    const match = String(readTime).match(/\d+/);
    return match ? parseInt(match[0], 10) : 5;
  }

  async createBlog(dto: CreateBlogDto): Promise<Blog> {
    try {
      if (dto.coverImage && dto.coverImage.trim() !== '') {
        try {
          dto.coverImage = await this.mediaProvider.moveFile(FolderNames.BLOGs, dto.coverImage);
        } catch {
          dto.coverImage = undefined;
        }
      } else {
        dto.coverImage = undefined;
      }
      if (dto.thumbnail && dto.thumbnail.trim() !== '') {
        try {
          dto.thumbnail = await this.mediaProvider.moveFile(FolderNames.BLOGs, dto.thumbnail);
        } catch {
          dto.thumbnail = undefined;
        }
      } else {
        dto.thumbnail = undefined;
      }
      if (!dto.authorId || dto.authorId.trim() === '') {
        dto.authorId = undefined;
      }
      const blog = this.blogRepo.create(dto);
      const savedBlog = await this.blogRepo.save(blog);

      if (savedBlog.status === BlogStatus.PUBLISHED && !savedBlog.notificationSentAt) {
        const fullBlog = await this.blogRepo.findOne({
          where: { id: savedBlog.id },
          relations: ['category'],
        });
        if (fullBlog) {
          this.notifyAllCandidatesAboutArticle(fullBlog).catch((err) => {
            this.logger.warn(`Notification queue failed: ${err?.message}`);
          });
        }
      }

      return savedBlog;
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAllBlogs(query: GetAllBlogDto) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC', filters, search } = query;

      const qb = this.blogRepo
        .createQueryBuilder('blog')
        .leftJoinAndSelect('blog.category', 'category')
        .leftJoinAndSelect('blog.user', 'user');

      if (search) {
        qb.andWhere(
          `(
            LOWER(blog.title) LIKE :search
            OR LOWER(blog.shortDescription) LIKE :search
            OR LOWER(category.name) LIKE :search
          )`,
          { search: `%${search.toLowerCase()}%` },
        );
      }

      if (filters) {
        Object.keys(filters).forEach((field) => {
          qb.andWhere(`blog.${field} = :${field}`, { [field]: filters[field] });
        });
      }

      qb.orderBy(`blog.${sortBy}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      qb.skip((+page - 1) * +limit).take(+limit);

      const [data, total] = await qb.getManyAndCount();

      const ids = data.map((b) => b.id);
      let countMap = new Map<number, number>();
      if (ids.length > 0) {
        const counts = await this.blogReadRepo
          .createQueryBuilder('r')
          .select('r.blogId', 'blogId')
          .addSelect('COUNT(*)', 'count')
          .where('r.blogId IN (:...ids)', { ids })
          .groupBy('r.blogId')
          .getRawMany();
        countMap = new Map(counts.map((c: any) => [Number(c.blogId), Number(c.count)]));
      }

      const dataWithCount = data.map((b) => ({
        ...b,
        readCount: countMap.get(b.id) || 0,
      }));

      return { data: dataWithCount, total, page: +page, limit: +limit };
    } catch (error) {
      handleDBError(error);
    }
  }


  async findBlogById(id: number): Promise<Blog> {
    const blog = await this.blogRepo.findOne({
      where: { id },
      relations: ['category', 'user'],
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async updateBlog(id: number, dto: UpdateBlogDto): Promise<Blog> {
    try {
      const blog = await this.blogRepo.findOne({ where: { id } });
      if (!blog) throw new NotFoundException('Blog not found');

      const wasNotPublished = blog.status !== BlogStatus.PUBLISHED;

      if (dto.coverImage && dto.coverImage.trim() !== '' && dto.coverImage !== blog.coverImage) {
        try {
          dto.coverImage = await this.mediaProvider.moveFile(FolderNames.BLOGs, dto.coverImage);
        } catch {
          dto.coverImage = undefined;
        }
      } else if (dto.coverImage === '') {
        dto.coverImage = undefined;
      }
      if (dto.thumbnail && dto.thumbnail.trim() !== '' && dto.thumbnail !== blog.thumbnail) {
        try {
          dto.thumbnail = await this.mediaProvider.moveFile(FolderNames.BLOGs, dto.thumbnail);
        } catch {
          dto.thumbnail = undefined;
        }
      } else if (dto.thumbnail === '') {
        dto.thumbnail = undefined;
      }

      Object.assign(blog, dto);
      const savedBlog = await this.blogRepo.save(blog);

      const justPublished = wasNotPublished && savedBlog.status === BlogStatus.PUBLISHED;
      const stillNeedsNotification =
        savedBlog.status === BlogStatus.PUBLISHED && !savedBlog.notificationSentAt;

      if (justPublished || stillNeedsNotification) {
        const fullBlog = await this.blogRepo.findOne({
          where: { id: savedBlog.id },
          relations: ['category'],
        });
        if (fullBlog) {
          this.notifyAllCandidatesAboutArticle(fullBlog).catch((err) => {
            this.logger.warn(`Notification queue failed: ${err?.message}`);
          });
        }
      }

      return savedBlog;
    } catch (error) {
      handleDBError(error);
    }
  }

  async toggleEditorPick(id: number): Promise<Blog> {
    const blog = await this.findBlogById(id);
    blog.isEditorPick = !blog.isEditorPick;
    return this.blogRepo.save(blog);
  }

  async toggleFeatured(id: number): Promise<Blog> {
    const blog = await this.findBlogById(id);
    blog.isFeatured = !blog.isFeatured;
    return this.blogRepo.save(blog);
  }

  async toggleMembersContribution(id: number): Promise<Blog> {
    const blog = await this.findBlogById(id);
    blog.isMembersContribution = !blog.isMembersContribution;
    return this.blogRepo.save(blog);
  }

  async deleteBlog(id: number) {
    try {
      const blog = await this.findBlogById(id);
      return await this.blogRepo.remove(blog);
    } catch (error: any) {
      console.error('[deleteBlog] raw error:', error?.code, error?.detail, error?.constraint, error?.table);
      handleDBError(error);
    }
  }

  async getInsights(page = 1, limit = 10, categoryId?: number, search?: string) {
    const cleanedSearch = search ? search.toLowerCase().trim() : '';

    const editorPicksQb = this.blogRepo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .where('blog.isEditorPick = true')
      .andWhere('blog.status = :status', { status: BlogStatus.PUBLISHED });

    if (categoryId) {
      editorPicksQb.andWhere('blog.categoryId = :categoryId', { categoryId });
    }
    if (cleanedSearch) {
      editorPicksQb.andWhere(
        `(
          LOWER(blog.title) LIKE :search
          OR LOWER(blog.shortDescription) LIKE :search
          OR LOWER(category.name) LIKE :search
        )`,
        { search: `%${cleanedSearch}%` },
      );
    }

    const editorPicks = await editorPicksQb
      .orderBy('blog.createdAt', 'DESC')
      .take(5)
      .getMany();

    const membersQb = this.blogRepo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .where('blog.status = :status', { status: BlogStatus.PUBLISHED })
      .andWhere('blog.isMembersContribution = true')
      .andWhere('blog.isEditorPick = false');

    if (categoryId) {
      membersQb.andWhere('blog.categoryId = :categoryId', { categoryId });
    }
    if (cleanedSearch) {
      membersQb.andWhere(
        `(
          LOWER(blog.title) LIKE :search
          OR LOWER(blog.shortDescription) LIKE :search
          OR LOWER(category.name) LIKE :search
        )`,
        { search: `%${cleanedSearch}%` },
      );
    }

    membersQb
      .orderBy('blog.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [membersContributions, membersTotal] =
      await membersQb.getManyAndCount();

    const articlesQb = this.blogRepo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .where('blog.status = :status', { status: BlogStatus.PUBLISHED })
      .andWhere('blog.isEditorPick = false')
      .andWhere('blog.isMembersContribution = false');

    if (categoryId) {
      articlesQb.andWhere('blog.categoryId = :categoryId', { categoryId });
    }
    if (cleanedSearch) {
      articlesQb.andWhere(
        `(
          LOWER(blog.title) LIKE :search
          OR LOWER(blog.shortDescription) LIKE :search
          OR LOWER(category.name) LIKE :search
        )`,
        { search: `%${cleanedSearch}%` },
      );
    }

    articlesQb
      .orderBy('blog.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [articles, articlesTotal] = await articlesQb.getManyAndCount();

    return {
      editorPicks,
      membersContributions,
      articles,
      meta: {
        page,
        limit,
        membersTotal,
        articlesTotal,
        total: articlesTotal,
      },
    };
  }

  async findBlogBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogRepo.findOne({
      where: { slug, status: BlogStatus.PUBLISHED },
      relations: ['category'],
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async getRelatedArticles(slug: string): Promise<Blog[]> {
    const currentBlog = await this.blogRepo.findOne({
      where: { slug, status: BlogStatus.PUBLISHED },
      relations: ['category'],
    });

    if (!currentBlog) {
      throw new NotFoundException('Article not found');
    }

    if (!currentBlog.category?.id) {
      return [];
    }

    const related = await this.blogRepo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .where('blog.status = :status', { status: BlogStatus.PUBLISHED })
      .andWhere('blog.categoryId = :categoryId', {
        categoryId: currentBlog.category.id,
      })
      .andWhere('blog.id != :currentId', { currentId: currentBlog.id })
      .orderBy('blog.createdAt', 'DESC')
      .take(3)
      .getMany();

    return related;
  }

  async createCategory(dto: CreateBlogCategoryDto): Promise<BlogCategory> {
    try {
      const category = this.categoryRepo.create(dto);
      return await this.categoryRepo.save(category);
    } catch (error) {
      handleDBError(error);
    }
  }

  async findAllCategories(): Promise<BlogCategory[]> {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async updateCategory(id: number, dto: UpdateBlogCategoryDto): Promise<BlogCategory> {
    try {
      const category = await this.categoryRepo.findOne({ where: { id } });
      if (!category) throw new NotFoundException('Category not found');
      Object.assign(category, dto);
      return await this.categoryRepo.save(category);
    } catch (error) {
      handleDBError(error);
    }
  }

  async deleteCategory(id: number) {
    try {
      const category = await this.categoryRepo.findOne({ where: { id } });
      if (!category) throw new NotFoundException('Category not found');
      return await this.categoryRepo.remove(category);
    } catch (error) {
      handleDBError(error);
    }
  }

  async markBlogAsRead(slug: string, userId: string): Promise<{ alreadyRead: boolean }> {
    const blog = await this.blogRepo.findOne({ where: { slug } });
    if (!blog) throw new NotFoundException('Blog not found');
    const existing = await this.blogReadRepo.findOne({ where: { blogId: blog.id, userId } });
    if (existing) return { alreadyRead: true };
    try {
      const read = this.blogReadRepo.create({ blogId: blog.id, userId });
      await this.blogReadRepo.save(read);
    } catch (err: any) {
      if (err?.code === '23505') return { alreadyRead: true };
      throw err;
    }
    return { alreadyRead: false };
  }

  async getBlogReaders(blogId: number, page = 1, limit = 20, search = '') {
    const blog = await this.blogRepo.findOne({ where: { id: blogId } });
    if (!blog) throw new NotFoundException('Blog not found');

    const skip = (page - 1) * limit;

    const qb = this.blogReadRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('user.candidate', 'candidate')
      .where('r.blogId = :blogId', { blogId });

    if (search) {
      qb.andWhere(
        `(
          LOWER(candidate.firstName) LIKE :s
          OR LOWER(candidate.lastName) LIKE :s
          OR LOWER(user.email) LIKE :s
        )`,
        { s: `%${search.toLowerCase()}%` },
      );
    }

    qb.orderBy('r.createdAt', 'DESC').skip(skip).take(limit);

    const [reads, total] = await qb.getManyAndCount();

    const data = reads.map((r) => {
      const u: any = r.user || {};
      const c: any = u.candidate || {};
      const name =
        `${c.firstName || ''} ${c.lastName || ''}`.trim() ||
        u.username ||
        u.email ||
        'Unknown';
      return {
        userId: r.userId,
        candidateId: c.id || null,
        name,
        email: u.email || '—',
        phone: c.phoneNumber ? `${c.countryCode || ''} ${c.phoneNumber}`.trim() : '—',
        avatar: c.profileImage || null,
        readAt: r.createdAt,
      };
    });

    return { data, total, page, limit, blogTitle: blog.title };
  }

  async getBlogReadCount(blogId: number): Promise<number> {
    return this.blogReadRepo.count({ where: { blogId } });
  }
}