import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationProvider } from './notification.provider';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { FcmToken } from './entities/fcmToken.entity';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './repository/notification.repository';
import { FcmTokenRepository } from './repository/fcmToken.repository';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([FcmToken, Notification])],
  providers: [
    NotificationProvider,
    NotificationService,
    NotificationRepository,
    FcmTokenRepository,
  ],
  exports: [NotificationProvider, NotificationService, NotificationRepository, FcmTokenRepository],
  controllers: [NotificationController],
})
export class NotificationModule {}
