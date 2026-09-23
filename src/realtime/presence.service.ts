import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private counts = new Map<string, number>();
  private activeConv = new Map<string, string | null>();

  online(userId: string) {
    const c = this.counts.get(userId) ?? 0;
    this.counts.set(userId, c + 1);
  }

  offline(userId: string) {
    const c = this.counts.get(userId) ?? 0;
    if (c <= 1) {
      this.counts.delete(userId);
      this.activeConv.delete(userId);
    } else {
      this.counts.set(userId, c - 1);
    }
  }

  isOnline(userId: string) {
    return this.counts.has(userId);
  }

  setActiveConversation(userId: string, conversationId?: string | null) {
    if (!conversationId) this.activeConv.delete(userId);
    else this.activeConv.set(userId, conversationId);
  }

  isActiveInConversation(userId: string, conversationId: string) {
    return this.activeConv.get(userId) === conversationId;
  }
}
