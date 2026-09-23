import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  pairKey(a: string, b: string) {
    return [a, b].sort().join(':');
  }

  toAscending<T extends { createdAt: any }>(rowsDesc: T[]): T[] {
    return [...rowsDesc].reverse();
  }

  buildTextPayload(conversationId: string, senderId: string, recipientId: string, body: string) {
    return { conversationId, senderId, recipientId, body, kind: 'text', status: 'sent' } as const;
  }

  buildAttachmentPayload(
    conversationId: string,
    senderId: string,
    recipientId: string,
    caption: string | null,
  ) {
    return {
      conversationId,
      senderId,
      recipientId,
      body: caption,
      kind: 'attachment',
      status: 'sent',
    } as const;
  }

  
}
