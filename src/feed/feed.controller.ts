import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Request } from 'express';
import { FeedProvider } from './feed.provider';
import { PaginationDTO } from '../lib/dto/pagination.dto';
import { IResponse } from '../lib/interfaces/response.interface';
import { CreateCommentDto } from './dto/createComment.dto';
import { CreatePostDto } from './dto/createPost.dto';
import { UpdatePostDto } from './dto/updatePost.dto';
import { GetAllFeedDto } from './dto/get-all-feed.dto';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { VotePollDto } from './dto/votePoll.dto';
import { Throttle } from '@nestjs/throttler';
@Controller('feed')
@UseGuards(AuthGuard, RolesGuard)
export class FeedController {
  constructor(private readonly feedProvider: FeedProvider) {}

  @Post('post')
  @Throttle({ 'post-creation': { limit: 5, ttl: 5 * 60 * 1000 } }) 
  async createPost(@Body() payload: CreatePostDto, @Req() req: Request): Promise<IResponse> {
    const data = await this.feedProvider.createPost(payload, req.user.id);
    const message =
      data.status === 'UNDER_REVIEW'
        ? 'Your post is under review and will be published once approved'
        : 'Post published successfully';
    return { data, message };
  }

  @Patch('post/:id')
  @Roles(UserRoles.SUPER_ADMIN, UserRoles.MODERATOR, UserRoles.COMPANY, UserRoles.CANDIDATE)
  async update(@Param('id') id: string, @Body() dto: UpdatePostDto, @Req() req: Request) {
    const data = await this.feedProvider.updatePost(id, dto, req.user.id, req.user.role);
    const message =
      data.status === 'UNDER_REVIEW'
        ? 'Your post is under review and will be published once approved'
        : 'Post updated successfully';
    return { data, message };
  }

  @Delete('post/:id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    const message = await this.feedProvider.deletePost(id, req.user.id, req.user.role);
    return { message };
  }

  @Get()
  async findAll(@Query() query: GetAllFeedDto, @Req() req: Request) {
    const data = await this.feedProvider.findAll(query, req.user.id);
    return { data };
  }

  @Get('following')
  async getFollowingFeed(@Query() query: GetAllFeedDto, @Req() req: Request) {
    const data = await this.feedProvider.getFollowingFeed(query, req.user.id);
    return { data };
  }

  // 🔥 SAVED POSTS - Must come BEFORE :postId routes
  @Get('saved')
  async getSavedPosts(@Query() query: GetAllFeedDto, @Req() req: Request) {
    const data = await this.feedProvider.getSavedPosts(query, req.user.id);
    return { data };
  }

  @Get(':postId/likes')
  async findPostLikes(
    @Req() req: Request,
    @Query() qParams: PaginationDTO,
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<IResponse> {
    const data = await this.feedProvider.findPostLikes(req.user.id, postId, qParams);
    return { data };
  }

  @Get(':postId/comments')
  async findPostComments(
    @Req() req: Request,
    @Query() qParams: PaginationDTO,
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<IResponse> {
    const data = await this.feedProvider.findPostComments(req.user.id, postId, qParams);
    return { data };
  }

  @Delete('comment/:commentId')
  async deleteComment(
    @Req() req: Request,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<IResponse> {
    const message = await this.feedProvider.deleteComment(req.user.id, commentId);
    return { message };
  }

  @Post('post/:postId/like')
  async toggleLike(
    @Req() req: Request,
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<IResponse> {
    const message = await this.feedProvider.toggleLike(req.user.id, postId);
    return { message };
  }

@Post('post/comment')
  @Throttle({ 'comment-creation': { limit: 10, ttl: 60 * 1000 } })
  async createComment(@Body() payload: CreateCommentDto, @Req() req: Request): Promise<IResponse> {
    const data = await this.feedProvider.createComment(payload, req.user.id);
    return { data };
  }

  @Patch('comment/:commentId')
  async updateComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() body: { comment: string },
    @Req() req: Request,
  ): Promise<IResponse> {
    const data = await this.feedProvider.updateComment(req.user.id, commentId, body.comment);
    return { data };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 POLL ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════

  @Get('post/:postId/poll')
  async getPoll(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Req() req: Request,
  ): Promise<IResponse> {
    const data = await this.feedProvider.getPoll(postId, req.user.id);
    return { data };
  }

  @Post('post/:postId/poll/vote')
  async votePoll(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() payload: VotePollDto,
    @Req() req: Request,
  ): Promise<IResponse> {
    const data = await this.feedProvider.votePoll(postId, req.user.id, payload.optionId);
    return { data, message: 'Vote recorded' };
  }

  @Delete('post/:postId/poll/vote')
  async unvotePoll(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Req() req: Request,
  ): Promise<IResponse> {
    const data = await this.feedProvider.unvotePoll(postId, req.user.id);
    return { data, message: 'Vote removed' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 TRENDING TAGS — for hashtag autocomplete + sidebar
  // ═══════════════════════════════════════════════════════════════════

  @Get('trending-tags')
  async getTrendingTags(@Query('limit') limit?: string): Promise<IResponse> {
    const limitNum = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 50);
    const data = await this.feedProvider.getTrendingTags(limitNum);
    return { data };
  }

  // 🔥 MY USED TAGS — current user's previously used hashtags (for composer dropdown)
  @Get('my-tags')
  async getMyTags(
    @Query('limit') limit: string | undefined,
    @Req() req: Request,
  ): Promise<IResponse> {
    const limitNum = Math.min(Math.max(parseInt(limit || '15', 10) || 15, 1), 50);
    const data = await this.feedProvider.getMyUsedTags(req.user.id, limitNum);
    return { data };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 SAVED POSTS
  // ═══════════════════════════════════════════════════════════════════

  @Post('post/:postId/save')
  async toggleSave(
    @Req() req: Request,
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<IResponse> {
    const result = await this.feedProvider.toggleSave(req.user.id, postId);
    return { data: result, message: result.message };
  }

  @Get('search')
  async searchNexus(@Query('q') query: string, @Query('limit') limit?: string) {
    const data = await this.feedProvider.searchNexus(query, limit ? parseInt(limit, 10) : 5);
    return {
      status: true,
      message: 'Search results',
      data,
    };
  }
  // @Get()
  // async list(
  //   @Query('page') page: string = '1',
  //   @Query('limit') limit: string = '10',
  //   @Query('search') search?: string, // 🔥 NEW
  //   @Query('filters[tag]') tagFilter?: string, // existing tag filter
  //   // ... your other existing query params
  // ) {
  //   const data = await this.feedProvider.list({
  //     page: parseInt(page, 10),
  //     limit: parseInt(limit, 10),
  //     search, // 🔥 PASS to provider
  //     tagFilter,
  //     // ... rest
  //   });
  //   return data;
  // }
}
