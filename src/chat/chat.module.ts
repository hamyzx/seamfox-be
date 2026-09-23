import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatProvider } from './chat.provider';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { ConversationRepository } from './repositories/conversation.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { MessageRepository } from './repositories/message.repository';
import { MessageAttachmentRepository } from './repositories/message-attachment.repository';
import { WsAuthGuard } from '../lib/guards/wsAuth.guard';
import { PresenceService } from '../realtime/presence.service';
import { WsEmitterService } from '../realtime/ws-emitter.service';
import { InterestModule } from '../interest/interest.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ConversationPermanentRepository } from './repositories/conversation-permanent.repository';
import { ConversationPermanent } from './entities/conversation-permanent.entity';
import { EmailService } from '../services/mail.service'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationPermanent,
      ConversationParticipant,
      Message,
      MessageAttachment,
    ]),
    InterestModule,
    SubscriptionModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatProvider,
    ChatService,
    ConversationRepository,
    ConversationPermanentRepository,
    ParticipantRepository,
    MessageRepository,
    MessageAttachmentRepository,
    WsAuthGuard,
    PresenceService,
    WsEmitterService,
    EmailService, 
  ],
  exports: [ChatProvider],
})
export class ChatModule {}