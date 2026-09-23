import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UnAuthorizedHandler } from '../lib/helpers/responseHandlers';
import { PaginationDTO } from '../lib/dto/pagination.dto';
import { FcmToken } from './entities/fcmToken.entity';
import { PushNotificationDto } from './dto/pushNotification.dto';
import { CreateFcmTokenDto } from './dto/createFcmToken.dto';
import { NotificationRepository } from './repository/notification.repository';
import { FcmTokenRepository } from './repository/fcmToken.repository';
import { Notification } from './entities/notification.entity';
import { DeleteResult } from 'typeorm';
import { SendNotificationParams } from './notification.interface';

@Injectable()
export class NotificationProvider {
  private readonly logger = new Logger('NotificationProvider');

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepository: NotificationRepository,
    private readonly fcmTokenRepository: FcmTokenRepository,
  ) {}

  async createFCMToken(payload: CreateFcmTokenDto): Promise<FcmToken> {
    return this.fcmTokenRepository.createToken(payload);
  }

  async getTokensByUserIds(userIds: string[]): Promise<string[]> {
    const tokens = await this.fcmTokenRepository.findTokensByUserIds(userIds);
    return tokens.map((t) => t.fcmToken);
  }

  async createNotifications(payload: Partial<Notification>[]): Promise<Notification[]> {
    const created = await this.notificationRepository.bulkCreate(payload);
    this.logger.log(
      `[createNotifications] saved ${created?.length ?? 0} record(s) -> recipientIds=${JSON.stringify(
        payload.map((p) => p.recipientId),
      )} types=${JSON.stringify(payload.map((p) => p.type))}`,
    );
    return created;
  }

  async sendPushNotifications(
    recipientIds: string[],
    notification: PushNotificationDto,
    dataPayload?: { [key: string]: string },
  ): Promise<void> {
    const tokens = await this.getTokensByUserIds(recipientIds);
    this.logger.log(
      `[sendPushNotifications] recipientIds=${JSON.stringify(recipientIds)} tokensFound=${tokens.length}`,
    );
    if (!tokens.length) {
      this.logger.warn(
        `[sendPushNotifications] No FCM tokens for recipients=${JSON.stringify(
          recipientIds,
        )} — skipping push (DB notification already saved)`,
      );
      return;
    }

    await this.notificationService.sendNotifications(notification, tokens, dataPayload);
  }

  async sendNotifications({
    recipientIds,
    notification,
    dataPayload,
    senderId,
    metadata,
    type,
    senderName,
  }: SendNotificationParams): Promise<void> {
    this.logger.log(
      `[sendNotifications] type=${type} senderId=${senderId} recipientIds=${JSON.stringify(
        recipientIds,
      )} metadata=${JSON.stringify(metadata)}`,
    );

    const notificationsPayload: Partial<Notification>[] = recipientIds.map((recipientId) => ({
      title: notification.title,
      body: notification.body,
      recipientId,
      senderId,
      type,
      metadata,
    }));

    if (metadata?.conversationId) {
      const existing = await this.notificationRepository.findActiveChatNotification(
        senderId!,
        recipientIds[0],
        metadata?.conversationId,
      );

      if (existing) {
        const newCount = existing.messageCount + 1;

        this.logger.log(
          `[sendNotifications] existing chat notification id=${existing.id} -> incrementing count to ${newCount}`,
        );

        await this.notificationRepository.updateNotification(existing.id, {
          messageCount: newCount,
          title: `Recieved ${newCount} messages from ${senderName}`,
          body: `${senderName} sent you ${newCount} messages`,
          updatedAt: new Date(),
        });

        return;
      }
    }

    await this.createNotifications(notificationsPayload);

    try {
      await this.sendPushNotifications(recipientIds, notification, dataPayload);
    } catch (err: any) {
      this.logger.error(
        `[sendNotifications] push failed but DB notification is saved -> ${err?.message ?? err}`,
      );
    }
  }

  async getPaginatedNotifications(filter: PaginationDTO, recipientId: string) {
    this.logger.log(
      `[getPaginatedNotifications] recipientId=${recipientId} filter=${JSON.stringify(filter)}`,
    );
    const res: any = await this.notificationRepository.findPaginated(recipientId, filter);
    this.logger.log(
      `[getPaginatedNotifications] recipientId=${recipientId} returned=${
        res?.notifications?.length ?? res?.data?.length ?? 'unknown'
      } total=${res?.metadata?.total ?? res?.total ?? 'unknown'}`,
    );
    return res;
  }

  async markNotificationAsRead(id: string, recipientId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOneById(id);
    if (!notification) throw new NotFoundException('Notification not found');
    UnAuthorizedHandler({
      condition: notification.recipientId !== recipientId,
      message: 'Notification does not belong to you',
    });

    if (notification.readAt) return notification;

    return this.notificationRepository.updateReadAt(id, new Date());
  }

  async markAllNotificationsAsRead(recipientId: string): Promise<Notification[]> {
    await this.notificationRepository.bulkUpdateReadAt(recipientId);
    return this.notificationRepository.findByRecipientId(recipientId);
  }

  async deleteToken(fcmToken: string): Promise<DeleteResult> {
    return this.fcmTokenRepository.deleteByToken(fcmToken);
  }

  async getTokenByFcmToken(fcmToken: string): Promise<FcmToken | null> {
    return this.fcmTokenRepository.getTokenByFcmToken(fcmToken);
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationRepository.countUnread(recipientId);
  }

  async deleteAllTokensForUser(userId: string): Promise<void> {
    await this.fcmTokenRepository.deleteByUserId(userId);
  }
}