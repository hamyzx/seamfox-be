import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApplicationCommentService } from './application-comment.service';

@Controller('application-comments')
export class ApplicationCommentController {
  constructor(private readonly commentService: ApplicationCommentService) {}

  @Post(':applicationId')
  async addComment(
    @Param('applicationId') applicationId: number,
    @Body('comment') comment: string,
    @Body('createdBy') createdBy?: number,
  ) {
    return this.commentService.addComment(applicationId, comment, createdBy);
  }

  @Get(':applicationId')
  async getComments(@Param('applicationId') applicationId: number) {
    return this.commentService.getComments(applicationId);
  }
}
