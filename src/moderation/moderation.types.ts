import { PostStatus } from '../lib/enums/post-visibility.enum';

export interface ModerationResult {
  flagged: boolean;
  status: PostStatus;
  reason?: string;
  score?: number;
}
