import { Injectable } from '@nestjs/common';
import { PostStatus } from '../lib/enums/post-visibility.enum';
import { BANNED_WORDS } from './moderation.constants';
import { ModerationResult } from './moderation.types';

@Injectable()
export class ModerationService {
  private containsBannedWords(text: string): boolean {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return BANNED_WORDS.some((word) => {
      const pattern = new RegExp(`\\b${word}\\b`, 'i');
      return pattern.test(lowerText);
    });
  }

  moderateContent(content: string): ModerationResult {
    if (this.containsBannedWords(content)) {
      return {
        flagged: true,
        status: PostStatus.UNDER_REVIEW,
        reason: 'Contains prohibited content',
        score: 1.0,
      };
    }

    return {
      flagged: false,
      status: PostStatus.PUBLISHED,
    };
  }
}
