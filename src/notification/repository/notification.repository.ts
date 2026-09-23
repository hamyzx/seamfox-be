import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { IPagination } from '../../lib/interfaces/pagination.interface';
import { NotificationTypes } from '../../lib/enums/notification.enum';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async findOneById(id: string): Promise<Notification | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByRecipientId(recipientId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { recipientId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPaginated(
    recipientId: string,
    { page, limit }: { page: number; limit: number },
  ): Promise<{ notifications: Notification[]; metadata: IPagination }> {
    const [notifications, total] = await this.repo.findAndCount({
      where: { recipientId },
      relations: {
        recipient: true,
        sender: {
          candidate: true,
          company: true,
        },
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      notifications,
      metadata: {
        total,
        page,
        limit,
      },
    };
  }

  async bulkCreate(payload: Partial<Notification>[]): Promise<Notification[]> {
    const notifications = this.repo.create(payload);
    return this.repo.save(notifications);
  }

  async updateReadAt(id: string, date: Date): Promise<Notification> {
    await this.repo.update({ id }, { readAt: date });
    return this.findOneById(id) as Promise<Notification>;
  }

  async bulkUpdateReadAt(recipientId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('recipientId = :recipientId AND readAt IS NULL', { recipientId })
      .execute();
  }

  async countUnread(recipientId: string): Promise<number> {
    return this.repo
      .createQueryBuilder('n')
      .where('n.recipientId = :recipientId', { recipientId })
      .andWhere('n.readAt IS NULL')
      .getCount();
  }

  async findActiveChatNotification(senderId: string, recipientId: string, conversationId: string) {
    return this.repo
      .createQueryBuilder('n')
      .where('n.senderId = :senderId', { senderId })
      .andWhere('n.recipientId = :recipientId', { recipientId })
      .andWhere('n.type = :type', { type: NotificationTypes.CHAT_MESSAGE })
      .andWhere('n.readAt IS NULL')
      .andWhere(`n.metadata->>'conversationId' = :conversationId`, {
        conversationId,
      })
      .getOne();
  }

  async updateNotification(id: string, data: Partial<Notification>) {
    await this.repo.update({ id }, data);
    return this.findOneById(id);
  }
}