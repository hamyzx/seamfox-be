import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationParticipant } from '../entities/conversation-participant.entity';

@Injectable()
export class ParticipantRepository {
  constructor(
    @InjectRepository(ConversationParticipant) private repo: Repository<ConversationParticipant>,
  ) {}
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const row = await this.repo.findOne({ where: { conversationId, userId }, select: ['id'] });
    return !!row;
  }

  async upsertParticipant(conversationId: string, userId: string) {
    const existing = await this.repo.findOne({
      where: { conversationId, userId },
      withDeleted: true,
    });
    if (existing) {
      if (existing.deletedAt) {
        await this.repo.update({ id: existing.id }, { deletedAt: null });
      }
      return existing;
    }
    return this.repo.save(this.repo.create({ conversationId, userId }));
  }

  async restoreForUser(conversationId: string, userId: string) {
    return this.repo
      .createQueryBuilder()
      .update('conversation_participants')
      .set({
        deletedAt: null,
        isArchived: false,
        archivedAt: null,
      })
      .where('"conversationId" = :conversationId', { conversationId })
      .andWhere('"userId" = :userId', { userId })
      .execute();
  }

  async softDeleteForUser(conversationId: string, userId: string) {
    return this.repo.update({ conversationId, userId }, { deletedAt: () => 'NOW()' as any });
  }

  async findParticipant(conversationId: string, userId: string) {
    return this.repo.findOne({
      where: { conversationId, userId },
    });
  }

  async archiveForUser(conversationId: string, userId: string) {
    return this.repo
      .createQueryBuilder()
      .update('conversation_participants')
      .set({
        isArchived: true,
        archivedAt: new Date(),
      })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('userId = :userId', { userId })
      .execute();
  }

  async lockOtherParticipant(conversationId: string, currentUserId: string) {
    return this.repo
      .createQueryBuilder()
      .update('conversation_participants')
      .set({ isLocked: true })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('userId != :currentUserId', { currentUserId })
      .execute();
  }

  async unlockOtherParticipant(conversationId: string, currentUserId: string) {
    return this.repo
      .createQueryBuilder()
      .update('conversation_participants')
      .set({ isLocked: false })
      .where('"conversationId" = :conversationId', { conversationId })
      .andWhere('"userId" != :currentUserId', { currentUserId })
      .execute();
  }

  async isDeletedForUser(conversationId: string, userId: string): Promise<boolean> {
    const row = await this.repo.findOne({
      where: { conversationId, userId },
      select: ['deletedAt'],
      withDeleted: true,
    });
    return !!row?.deletedAt;
  }

  async incrementUnread(conversationId: string, userId: string, delta = 1) {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ unreadCount: () => `"unreadCount" + ${Math.max(1, delta)}` })
      .where('"conversationId" = :conversationId AND "userId" = :userId', {
        conversationId,
        userId,
      })
      .execute();
  }

  async resetUnread(conversationId: string, userId: string) {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ unreadCount: 0 })
      .where('"conversationId" = :conversationId AND "userId" = :userId', {
        conversationId,
        userId,
      })
      .execute();
  }

  async deleteByConversation(conversationId: string) {
    return this.repo
      .createQueryBuilder()
      .delete()
      .from('conversation_participants')
      .where(`"conversationId" = :c`, { c: conversationId })
      .execute();
  }

  async getParticipants(conversationId: string) {
    return this.repo
      .createQueryBuilder('p')
      .innerJoin('user', 'u', 'u.id = p."userId"')
      .leftJoin('candidate', 'cand', 'cand."userId" = u.id')
      .leftJoin('company', 'comp', 'comp."userId" = u.id')
      .select([
        'p."userId" AS "userId"',
        'u.role AS "role"',
        'cand.id AS "candidateId"',
        'comp.id AS "companyId"',
      ])
      .where('p."conversationId" = :conversationId', { conversationId })
      .getRawMany();
  }
}
