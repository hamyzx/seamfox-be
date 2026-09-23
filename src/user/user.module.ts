import { forwardRef, Global, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserProvider } from './user.provider';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DeletedUserArchive } from './entities/deleted-user-archive.entity';
import { MediaModule } from '../media/media.module';
import { UserRepository } from './repository/user.repository';
import { AuthService } from '../auth/auth.service';
import { UserAdminController } from './user.admin.controller';
import { UserService } from './user.service';
import { FollowerRepository } from './repository/follower.repository';
import { Follower } from './entities/follower.entity';
import { Friend } from './entities/friend.entity';
import { UserRequest } from './entities/request.entity';
import { FriendRepository } from './repository/friend.repository';
import { RequestRepository } from './repository/request.repository';
import { EmailService } from '../services/mail.service'; // 🔥 NEW

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Follower,
      Friend,
      UserRequest,
      DeletedUserArchive,
    ]),
    forwardRef(() => MediaModule),
  ],
  controllers: [UserAdminController, UserController],
  providers: [
    UserRepository,
    UserProvider,
    AuthService,
    UserService,
    FollowerRepository,
    FriendRepository,
    RequestRepository,
    EmailService, // 🔥 NEW
  ],
  exports: [UserProvider, UserRepository, TypeOrmModule, AuthService],
})
export class UserModule {}