import { forwardRef, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { ModerationModule } from '../moderation/moderation.module';
import { FeedController } from './feed.controller';
import { Post } from './entities/post.entity';
import { PostShare } from './entities/post-share.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostSave } from './entities/post-save.entity';
import { FeedProvider } from './feed.provider';
import { PostRepository } from './repositories/post.repository';
import { PostLikeRepository } from './repositories/post-like.repository';
import { PostCommentRepository } from './repositories/post-comment.repository';
import { PostSaveRepository } from './repositories/post-save.repository';
import { UserModule } from '../user/user.module';
import { PostMediaRepository } from './repositories/post-media.repository';
import { Poll } from './entities/poll.entity';
import { PollOption } from './entities/poll-option.entity';
import { PollVote } from './entities/poll-vote.entity';
import { PollRepository } from './repositories/poll.repository';

import { EmailService } from '../services/mail.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostShare,
      PostMedia,
      PostLike,
      PostComment,
      PostSave,
      Poll,
      PollOption,
      PollVote,
    ]),
    MediaModule,
    ModerationModule,
    UserModule,
  ],
  controllers: [FeedController],
  providers: [
    FeedProvider,
    PostRepository,
    PostLikeRepository,
    PostCommentRepository,
    PostMediaRepository,
    PostSaveRepository,
    PollRepository,
    EmailService, // 
  ],
  exports: [FeedProvider],
})
export class FeedModule {}