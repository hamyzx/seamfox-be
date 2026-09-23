import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { User } from '../../user/entities/user.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { Company } from '../../company/entities/company.entity';

@Injectable()
export class MessageRepository {
  constructor(@InjectRepository(Message) private repo: Repository<Message>) {}
  createMessage(payload: Partial<Message>) {
    console.log(payload,"payload===")
    return this.repo.save(this.repo.create(payload));
  }

  findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: { sender: true, recipient: true, attachments: true },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        recipientId: true,
        body: true,
        kind: true,
        status: true,
        deliveredAt: true,
        seenAt: true,
        createdAt: true,
        sender: { id: true, firstName: true, lastName: true, username: true, profileImg: true },
        recipient: { id: true, firstName: true, lastName: true, username: true, profileImg: true },
        attachments: {
          id: true,
          type: true,
          url: true,
          thumbnailUrl: true,
          mime: true,
          filename: true,
          size: true,
          width: true,
          height: true,
          pages: true,
          duration: true,
        },
      },
    });
  }

  // list(conversationId: string, offset = 0, limit = 50) {
  //   return this.repo.findAndCount({
  //     where: { conversationId },
  //     order: { createdAt: 'DESC' },
  //     take: limit,
  //     skip: offset,
  //     relations: { sender: true, recipient: true, attachments: true },
  //     select: {
  //       id: true,
  //       conversationId: true,
  //       senderId: true,
  //       recipientId: true,
  //       body: true,
  //       kind: true,
  //       status: true,
  //       deliveredAt: true,
  //       seenAt: true,
  //       createdAt: true,
  //       sender: { id: true, firstName: true, lastName: true, username: true, profileImg: true },
  //       recipient: { id: true, firstName: true, lastName: true, username: true, profileImg: true },
  //       attachments: {
  //         id: true,
  //         type: true,
  //         url: true,
  //         thumbnailUrl: true,
  //         mime: true,
  //         filename: true,
  //         size: true,
  //         width: true,
  //         height: true,
  //         pages: true,
  //         duration: true,
  //       },
  //     },
  //   });
  // }

  async list(currentUserId: string, conversationId: string, offset = 0, limit = 50) {
    const qb = this.repo
      .createQueryBuilder('m')

      /* SENDER */
      .innerJoin(User, 'sender', 'sender.id = m."senderId"')
      .leftJoin(Candidate, 'sc', 'sc."userId" = sender.id')
      .leftJoin(Company, 'sp', 'sp."userId" = sender.id')

      /* RECIPIENT */
      .innerJoin(User, 'recipient', 'recipient.id = m."recipientId"')
      .leftJoin(Candidate, 'rc', 'rc."userId" = recipient.id')
      .leftJoin(Company, 'rp', 'rp."userId" = recipient.id')

      .leftJoin('m.attachments', 'att')
      .where('m."conversationId" = :conversationId', { conversationId })
      .andWhere('m."deletedAt" IS NULL')
      .orderBy('m."createdAt"', 'DESC')
      .offset(offset)
      .limit(limit);

    qb.select([
      /* BASIC MESSAGE FIELDS */
      'm.id AS id',
      'm."conversationId" AS "conversationId"',
      'm."senderId" AS "senderId"',
      'm."recipientId" AS "recipientId"',
      'm.body AS body',
      'm.kind AS kind',
      'm.status AS status',
      'm."deliveredAt" AS "deliveredAt"',
      'm."seenAt" AS "seenAt"',
      'm."createdAt" AS "createdAt"',
      '(m."senderId" = :currentUserId) AS "isOwnMessage"',

      /* ⭐ ENRICHED SENDER INFO */
      `
    jsonb_build_object(
      'id', sender.id,
      'userType', sender.role,

      'firstName',
        CASE
          WHEN sc.id IS NOT NULL THEN sc."firstName"
          WHEN sp.id IS NOT NULL THEN sp."name"
          ELSE sender."firstName"
        END,

      'lastName',
        CASE
          WHEN sc.id IS NOT NULL THEN sc."lastName"
          WHEN sp.id IS NOT NULL THEN ''
          ELSE sender."lastName"
        END,

      'profileImg',
        CASE
          WHEN sc.id IS NOT NULL THEN sc."profileImage"
          WHEN sp.id IS NOT NULL THEN sp."logo"
          ELSE sender."profileImg"
        END
    ) AS sender
    `,

      /* ⭐ ENRICHED RECIPIENT INFO */
      `
    jsonb_build_object(
      'id', recipient.id,
      'userType', recipient.role,

      'firstName',
        CASE
          WHEN rc.id IS NOT NULL THEN rc."firstName"
          WHEN rp.id IS NOT NULL THEN rp."name"
          ELSE recipient."firstName"
        END,

      'lastName',
        CASE
          WHEN rc.id IS NOT NULL THEN rc."lastName"
          WHEN rp.id IS NOT NULL THEN ''
          ELSE recipient."lastName"
        END,

      'profileImg',
        CASE
          WHEN rc.id IS NOT NULL THEN rc."profileImage"
          WHEN rp.id IS NOT NULL THEN rp."logo"
          ELSE recipient."profileImg"
        END
    ) AS recipient
    `,

      /* ⭐ ATTACHMENTS */
      `
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.type,
          'url', a.url,
          'thumbnailUrl', a."thumbnailUrl",
          'mime', a.mime,
          'filename', a.filename,
          'size', a.size,
          'width', a.width,
          'height', a.height,
          'pages', a.pages,
          'duration', a.duration
        )
      )
      FROM message_attachments a
      WHERE a."messageId" = m.id
    ) AS attachments
    `,
    ]);

    const [rows, total] = await Promise.all([
      qb.setParameters({ currentUserId }).getRawMany(),
      this.repo.count({ where: { conversationId } }),
    ]);

    return [rows, total] as const;
  }

  async markDelivered(conversationId: string, recipientId: string) {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ status: 'delivered', deliveredAt: () => 'NOW()' })
      .where(
        '"conversationId" = :conversationId AND "recipientId" = :recipientId AND status = :status',
        {
          conversationId,
          recipientId,
          status: 'sent',
        },
      )
      .execute();
  }

  async markSeen(conversationId: string, userId: string) {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ status: 'seen', seenAt: () => 'NOW()' })
      .where(
        `"conversationId" = :conversationId 
       AND "recipientId" = :userId 
       AND status != 'seen'`,
        { conversationId, userId },
      )
      .execute();
  }

  async deleteByConversation(conversationId: string) {
    return this.repo
      .createQueryBuilder()
      .delete()
      .from('messages')
      .where(`"conversationId" = :c`, { c: conversationId })
      .execute();
  }
}
