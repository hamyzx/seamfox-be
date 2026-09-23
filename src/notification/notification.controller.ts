import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationProvider } from './notification.provider';
import { PaginationDTO } from '../lib/dto/pagination.dto';
import { IResponse } from '../lib/interfaces/response.interface';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Request } from 'express';
import { UuidDTO } from '../lib/dto/uuid.dto';
import { CreateFcmTokenDto } from './dto/createFcmToken.dto';

@Controller('notification')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationProvider: NotificationProvider) {}

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 FCM TOKEN ENDPOINTS — register/remove device tokens
  // ═══════════════════════════════════════════════════════════════════

  @Post('fcm-token')
  async registerFcmToken(
    @Body() payload: CreateFcmTokenDto,
    @Req() req: Request,
  ): Promise<IResponse> {
    const userId = req.user!.id;
    const data = await this.notificationProvider.createFCMToken({
      fcmToken: payload.fcmToken,
      createdBy: userId,
    } as any);
    return { data, message: 'FCM token registered successfully' };
  }

  @Delete('fcm-token')
  async removeFcmToken(
    @Body() payload: { fcmToken: string },
  ): Promise<IResponse> {
    const data = await this.notificationProvider.deleteToken(payload.fcmToken);
    return { data, message: 'FCM token removed successfully' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXISTING ROUTES — unchanged
  // ═══════════════════════════════════════════════════════════════════

  @Get('read-all')
  async markAllNotificationsAsRead(@Req() req: Request): Promise<IResponse> {
    const userId = req.user!.id;
    const data =
      await this.notificationProvider.markAllNotificationsAsRead(userId);
    return { data, message: 'All notification has been marked read' };
  }

  @Get('unread/count')
  async getUnreadCount(@Req() req: Request): Promise<IResponse> {
    const userId = req.user!.id;
    const count = await this.notificationProvider.getUnreadCount(userId);
    return { data: { count }, message: 'Unread notifications fetched successfully' };
  }

  @Get(':id')
  async markNotificationAsRead(
    @Param() params: UuidDTO,
    @Req() req: Request,
  ): Promise<IResponse> {
    const userId = req.user!.id;
    const data = await this.notificationProvider.markNotificationAsRead(
      params.id,
      userId,
    );
    return { data, message: 'Notification read successfully' };
  }

  @Get()
  async getMine(
    @Query() qParams: PaginationDTO,
    @Req() req: Request,
  ): Promise<IResponse> {
    const userId = req.user!.id;
    const data = await this.notificationProvider.getPaginatedNotifications(
      qParams,
      userId,
    );
    return { data };
  }
}