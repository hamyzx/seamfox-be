import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatProvider } from './chat.provider';
import { PaginationDTO } from './dto/pagination.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { Request } from 'express';
import { UserRoles } from '../lib/enums/user.enum';

@Controller('chat')
@UseGuards(AuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly provider: ChatProvider) {}
  @Get('inbox')
  async inbox(@Req() req: Request, @Query() q: PaginationDTO) {
    const data = await this.provider.listInbox(req.user.id, q.page, q.limit, q.search);
    return { data };
  }

  @Get('conversations/archived')
  async archivedInbox(@Req() req: Request) {
    const data = await this.provider.listArchivedInbox(req.user.id);
    return { data };
  }

  @Get('messages/:conversationId')
  async messages(
    @Req() req: Request,
    @Param('conversationId', new ParseUUIDPipe()) id: string,
    @Query() q: PaginationDTO,
  ) {
    const data = await this.provider.listMessages(req.user.role, req.user.id, id, q.page, q.limit);
    return { data };
  }

  @Post('send')
  async send(@Req() req: Request, @Body() dto: SendMessageDto) {
    const data = await this.provider.sendMessage(req.user.id, dto);
    return { data };
  }

  @Patch('conversations/:conversationId/me/archive')
  async archiveConversation(
    @Req() req: Request,
    @Param('conversationId', new ParseUUIDPipe()) id: string,
  ) {
    const data = await this.provider.archiveConversation(req.user.id, id);
    return { data };
  }

  @Delete('conversations/:conversationId/me')
  async deleteForMe(@Req() req: Request, @Param('conversationId', new ParseUUIDPipe()) id: string) {
    const data = await this.provider.deleteConversationForMe(req.user.id, id);
    return { data };
  }

  @Post('conversations/:conversationId/restore')
  async restoreForMe(
    @Req() req: Request,
    @Param('conversationId', new ParseUUIDPipe()) id: string,
  ) {
    const data = await this.provider.restoreConversationForMe(req.user.id, id);
    return { data };
  }

  @Post('messages/:conversationId/seen')
  async seen(
    @Req() req: Request,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
  ) {
    const data = await this.provider.markAsSeen(req.user.id, conversationId);
    return { data };
  }

  @Get('check-access')
  async checkChatAccess(@Req() req: Request) {
    const companyUserId = req.user.id;
    const data = await this.provider.checkChatAccess(companyUserId);
    return { data };
  }

  @Get('admin-check-access')
  @Roles(UserRoles.SUPER_ADMIN)
  async checkAdminChatAccess(@Req() req: Request) {
    console.log(req.user.role, 'req.user.role');
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    return {
      data: {
        allowed: true,
        unlimited: true,
      },
    };
  }

  @Post('request-assisted-search')
  @Roles(UserRoles.COMPANY)
  async requestAssistedSearch(@Req() req: Request, @Body() body: { message?: string }) {
    if (req.user.role !== UserRoles.COMPANY) {
      throw new ForbiddenException('Only companies can request assisted search');
    }
    const data = await this.provider.requestAssistedSearch(req.user.id, body.message);
    return { data };
  }

  @Get('admin/all-conversations')
  @Roles(UserRoles.SUPER_ADMIN)
  async adminAllConversations(@Query() q: PaginationDTO) {
    const data = await this.provider.adminListAllConversations(q.page, q.limit, q.search);
    return { data };
  }

  @Get('admin/messages/:conversationId')
  @Roles(UserRoles.SUPER_ADMIN)
  async adminMessages(
    @Param('conversationId', new ParseUUIDPipe()) id: string,
    @Query() q: PaginationDTO,
  ) {
    const data = await this.provider.adminListMessages(id, q.page, q.limit);
    return { data };
  }
}
