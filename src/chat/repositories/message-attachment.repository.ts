import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageAttachment } from '../entities/message-attachment.entity';

@Injectable()
export class MessageAttachmentRepository {
  constructor(@InjectRepository(MessageAttachment) private repo: Repository<MessageAttachment>) {}
  createMany(messageId: string, inputs: Partial<MessageAttachment>[]) {
    const rows = inputs.map((i) => this.repo.create({ messageId, ...i }));
    return this.repo.save(rows);
  }

  async deleteByConversation(conversationId: string) {
    return this.repo
      .createQueryBuilder()
      .delete()
      .from('message_attachments')
      .where(`"messageId" IN (SELECT "id" FROM "messages" WHERE "conversationId" = :c)`, {
        c: conversationId,
      })
      .execute();
  }
}
