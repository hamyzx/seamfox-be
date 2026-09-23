import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { ConversationPermanent } from '../entities/conversation-permanent.entity';

@Injectable()
export class ConversationPermanentRepository {
  constructor(
    @InjectRepository(ConversationPermanent) private repo: Repository<ConversationPermanent>,
  ) {}

  findByPairKey(pairKey: string) {
    return this.repo.findOne({ where: { pairKey } });
  }

  createAndSave(pairKey: string, subscriptionId: number) {
    return this.repo.save(this.repo.create({ pairKey, subscriptionId }));
  }

  findById(id: string) {
    return this.repo.findOne({
      where: { id },
      select: ['id', 'pairKey', 'createdAt', 'updatedAt'],
    });
  }

  async countCompanyConversations(companyUserId: string, subscriptionId: number): Promise<number> {
    return this.repo.count({
      where: [
        // company on left
        { pairKey: Like(`${companyUserId}:%`), subscriptionId },

        // company on right
        { pairKey: Like(`%:${companyUserId}`), subscriptionId },
      ],
    });
  }
}
