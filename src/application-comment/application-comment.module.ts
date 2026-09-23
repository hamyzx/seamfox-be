import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationCommentService } from './application-comment.service';
import { ApplicationCommentController } from './application-comment.controller';
import { ApplicationModule } from '../application/application.module';
import { JobApplicationComment } from './entities/job_application_comments.entity';
import { Application } from '../application/entities/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplicationComment, Application]),
    forwardRef(() => ApplicationModule),
  ],
  controllers: [ApplicationCommentController],
  providers: [ApplicationCommentService],
  exports: [ApplicationCommentService],
})
export class ApplicationCommentModule {}
