import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { ConversationParticipant } from '../entities/conversation-participant.entity';
import { Message } from '../entities/message.entity';
import { User } from '../../user/entities/user.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { Company } from '../../company/entities/company.entity';

@Injectable()
export class ConversationRepository {
  constructor(@InjectRepository(Conversation) private repo: Repository<Conversation>) {}

  findByPairKey(pairKey: string) {
    return this.repo.findOne({ where: { pairKey } });
  }

  createAndSave(pairKey: string) {
    return this.repo.save(this.repo.create({ pairKey }));
  }

  findById(id: string) {
    return this.repo.findOne({
      where: { id },
      select: ['id', 'pairKey', 'createdAt', 'updatedAt'],
    });
  }

  async inbox(userId: string, offset = 0, limit = 20, search?: string) {
    const qb = this.repo
      .createQueryBuilder('c')
      .innerJoin(
        ConversationParticipant,
        'me',
        `me."conversationId" = c.id AND me."userId" = :userId AND me."deletedAt" IS NULL AND me."isArchived" = false`,
        { userId },
      )
      .innerJoin(
        ConversationParticipant,
        'other',
        `other."conversationId" = c.id AND other."userId" <> :userId`,
        { userId },
      )
      .innerJoin(User, 'u', 'u.id = other."userId"')
      .leftJoin(Candidate, 'cand', 'cand."userId" = u.id')
      .leftJoin(Company, 'comp', 'comp."userId" = u.id')
      .andWhere('c."deletedAt" IS NULL');

    if (search?.trim()) {
      qb.andWhere(
        `(
          (cand.id IS NOT NULL AND (cand."firstName" ILIKE :q OR cand."lastName" ILIKE :q))
          OR (comp.id IS NOT NULL AND comp.name ILIKE :q)
          OR u.username ILIKE :q
        )`,
        { q: `%${search.trim()}%` },
      );
    }

    const lastTS = qb
      .subQuery()
      .select('m."conversationId"', 'conv_id')
      .addSelect('MAX(m."createdAt")', 'last_created_at')
      .from(Message, 'm')
      .where('m."deletedAt" IS NULL')
      .groupBy('m."conversationId"')
      .getQuery();

    qb.leftJoin(`(${lastTS})`, 'lm', 'lm.conv_id = c.id').leftJoin(
      Message,
      'm',
      `m."conversationId" = c.id AND m."createdAt" = lm.last_created_at AND m."deletedAt" IS NULL`,
    );

    qb.select([
      'c.id AS "conversationId"',
      'COALESCE(me."unreadCount", 0) AS "unreadCount"',
      'me."isLocked" AS "isLocked"',
      'm."createdAt" AS "lastMessageAt"',
      `jsonb_build_object(
        'id', u.id,
        'userType', u."role",
        'firstName', CASE WHEN cand.id IS NOT NULL THEN cand."firstName" WHEN comp.id IS NOT NULL THEN comp."name" ELSE u."firstName" END,
        'lastName', CASE WHEN cand.id IS NOT NULL THEN cand."lastName" WHEN comp.id IS NOT NULL THEN '' ELSE u."lastName" END,
        'candidateId', cand.id,
        'companyId', comp.id,
        'companyName', comp.name,
        'profileImg', CASE WHEN cand.id IS NOT NULL THEN cand."profileImage" WHEN comp.id IS NOT NULL THEN comp."logo" ELSE u."profileImg" END
      ) AS "otherUser"`,
      `CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', m.id, 'senderId', m."senderId", 'recipientId', m."recipientId",
        'body', m.body, 'status', m.status, 'createdAt', m."createdAt"
      ) END AS "lastMessage"`,
    ]);

    qb.orderBy('m."createdAt"', 'DESC', 'NULLS LAST')
      .addOrderBy('c."createdAt"', 'DESC')
      .offset(offset)
      .limit(limit);

    const countQ = this.repo
      .createQueryBuilder('c')
      .innerJoin(
        ConversationParticipant,
        'me',
        `me."conversationId" = c.id AND me."userId" = :userId AND me."deletedAt" IS NULL AND me."isArchived" = false`,
        { userId },
      )
      .andWhere('c."deletedAt" IS NULL');

    if (search?.trim()) {
      countQ
        .innerJoin(ConversationParticipant, 'other', `other."conversationId" = c.id AND other."userId" <> :userId`, { userId })
        .innerJoin(User, 'u', 'u.id = other."userId"')
        .andWhere('(u."firstName" ILIKE :q OR u."lastName" ILIKE :q OR u.username ILIKE :q)', { q: `%${search.trim()}%` });
    }

    const total = await countQ.getCount();
    const rows = await qb.getRawMany();
    return [rows, total] as const;
  }

  async archivedInbox(userId: string, offset = 0, limit = 20, search?: string) {
    const qb = this.repo
      .createQueryBuilder('c')
      .innerJoin(
        ConversationParticipant,
        'me',
        `me."conversationId" = c.id AND me."userId" = :userId AND me."deletedAt" IS NULL AND me."isArchived" = true`,
        { userId },
      )
      .innerJoin(ConversationParticipant, 'other', `other."conversationId" = c.id AND other."userId" <> :userId`, { userId })
      .innerJoin(User, 'u', 'u.id = other."userId"')
      .leftJoin(Candidate, 'cand', 'cand."userId" = u.id')
      .leftJoin(Company, 'comp', 'comp."userId" = u.id')
      .andWhere('c."deletedAt" IS NULL');

    const lastTS = qb
      .subQuery()
      .select('m."conversationId"', 'conv_id')
      .addSelect('MAX(m."createdAt")', 'last_created_at')
      .from(Message, 'm')
      .where('m."deletedAt" IS NULL')
      .groupBy('m."conversationId"')
      .getQuery();

    qb.leftJoin(`(${lastTS})`, 'lm', 'lm.conv_id = c.id').leftJoin(
      Message,
      'm',
      `m."conversationId" = c.id AND m."createdAt" = lm.last_created_at AND m."deletedAt" IS NULL`,
    );

    qb.select([
      'c.id AS "conversationId"',
      'COALESCE(me."unreadCount", 0) AS "unreadCount"',
      'm."createdAt" AS "lastMessageAt"',
      `jsonb_build_object(
        'id', u.id,
        'firstName', CASE WHEN cand.id IS NOT NULL THEN cand."firstName" WHEN comp.id IS NOT NULL THEN comp."name" ELSE u."firstName" END,
        'lastName', CASE WHEN cand.id IS NOT NULL THEN cand."lastName" WHEN comp.id IS NOT NULL THEN '' ELSE u."lastName" END,
        'profileImg', CASE WHEN cand.id IS NOT NULL THEN cand."profileImage" WHEN comp.id IS NOT NULL THEN comp."logo" ELSE u."profileImg" END
      ) AS "otherUser"`,
      `CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', m.id, 'senderId', m."senderId", 'recipientId', m."recipientId",
        'body', m.body, 'status', m.status, 'createdAt', m."createdAt"
      ) END AS "lastMessage"`,
    ]);

    qb.orderBy('m."createdAt"', 'DESC', 'NULLS LAST').offset(offset).limit(limit);

    const rows = await qb.getRawMany();
    const total = rows.length;
    return [rows, total] as const;
  }

  async deleteConversation(id: string) {
    return this.repo
      .createQueryBuilder()
      .delete()
      .from('conversations')
      .where(`"id" = :id`, { id })
      .execute();
  }

  // ✅ Admin — all company↔candidate conversations (no userId filter)
  async adminInbox(offset = 0, limit = 20, search?: string): Promise<[any[], number]> {
    const qb = this.repo
      .createQueryBuilder('c')
      // company participant
      .innerJoin(ConversationParticipant, 'cp1', `cp1."conversationId" = c.id`)
      .innerJoin(User, 'u1', `u1.id = cp1."userId" AND u1.role = 'COMPANY'`)
      .leftJoin(Company, 'comp', `comp."userId" = u1.id`)
      // candidate participant
      .innerJoin(ConversationParticipant, 'cp2', `cp2."conversationId" = c.id AND cp2."userId" <> cp1."userId"`)
      .innerJoin(User, 'u2', `u2.id = cp2."userId" AND u2.role = 'CANDIDATE'`)
      .leftJoin(Candidate, 'cand', `cand."userId" = u2.id`)
      .andWhere('c."deletedAt" IS NULL');

    if (search?.trim()) {
      qb.andWhere(
        `(comp.name ILIKE :q OR cand."firstName" ILIKE :q OR cand."lastName" ILIKE :q)`,
        { q: `%${search.trim()}%` },
      );
    }

    // Last message subquery
    const lastTS = qb
      .subQuery()
      .select('m."conversationId"', 'conv_id')
      .addSelect('MAX(m."createdAt")', 'last_created_at')
      .from(Message, 'm')
      .where('m."deletedAt" IS NULL')
      .groupBy('m."conversationId"')
      .getQuery();

    qb.leftJoin(`(${lastTS})`, 'lm', 'lm.conv_id = c.id')
      .leftJoin(
        Message,
        'msg',
        `msg."conversationId" = c.id AND msg."createdAt" = lm.last_created_at AND msg."deletedAt" IS NULL`,
      );

    qb.select([
      'c.id AS "id"',
      'c."pairKey" AS "pairKey"',
      'c."createdAt" AS "createdAt"',
      'msg.body AS "lastMessage"',
      'msg."createdAt" AS "lastMessageAt"',
      // Company info
      `jsonb_build_object(
        'role', 'COMPANY',
        'userId', u1.id,
        'companyName', comp.name,
        'companyEmail', comp.email,
        'profileImage', comp.logo
      ) AS "company"`,
      // Candidate info
      `jsonb_build_object(
        'role', 'CANDIDATE',
        'userId', u2.id,
        'candidateFirstName', cand."firstName",
        'candidateLastName', cand."lastName",
        'profileImage', cand."profileImage"
      ) AS "candidate"`,
    ]);

    qb.orderBy('lm.last_created_at', 'DESC', 'NULLS LAST')
      .addOrderBy('c."createdAt"', 'DESC')
      .offset(offset)
      .limit(limit);

    const countQb = this.repo
      .createQueryBuilder('c')
      .innerJoin(ConversationParticipant, 'cp1', `cp1."conversationId" = c.id`)
      .innerJoin(User, 'u1', `u1.id = cp1."userId" AND u1.role = 'COMPANY'`)
      .leftJoin(Company, 'comp', `comp."userId" = u1.id`)
      .innerJoin(ConversationParticipant, 'cp2', `cp2."conversationId" = c.id AND cp2."userId" <> cp1."userId"`)
      .innerJoin(User, 'u2', `u2.id = cp2."userId" AND u2.role = 'CANDIDATE'`)
      .leftJoin(Candidate, 'cand', `cand."userId" = u2.id`)
      .andWhere('c."deletedAt" IS NULL');

    if (search?.trim()) {
      countQb.andWhere(
        `(comp.name ILIKE :q OR cand."firstName" ILIKE :q OR cand."lastName" ILIKE :q)`,
        { q: `%${search.trim()}%` },
      );
    }

    const [rows, total] = await Promise.all([qb.getRawMany(), countQb.getCount()]);

    // Map rows so frontend gets consistent shape
    const mapped = rows.map((r) => ({
      id: r.id,
      pairKey: r.pairKey,
      createdAt: r.createdAt,
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
      participants: [r.company, r.candidate].filter(Boolean),
    }));

    return [mapped, total];
  }
}