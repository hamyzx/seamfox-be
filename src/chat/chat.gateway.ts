import { Provider, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatProvider } from './chat.provider';
import { SendMessageDto } from './dto/send-message.dto';
import { WsAuthGuard } from '../lib/guards/wsAuth.guard';
import { PresenceService } from '../realtime/presence.service';
import { WsEmitterService } from '../realtime/ws-emitter.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
@UseGuards(WsAuthGuard)
export class ChatGateway {
  @WebSocketServer() io: Server;
  constructor(
    private readonly provider: ChatProvider,
    private readonly presence: PresenceService,
    private readonly emitter: WsEmitterService,
    private readonly jwt: JwtService,
  ) {}

  afterInit(server: Server) {
    this.emitter.setServer(server);
    server.use(async (socket, next) => {
      try {
        console.log('ServerUser===');
        const hs: any = socket.handshake;
        let token: string | undefined = hs?.auth?.token;

        if (!token) {
          const authHeader: string = (hs?.headers?.authorization as string) ?? '';
          const m = authHeader.match(/^bearer\s+(.+)$/i);
          if (m?.[1]) token = m[1].trim();
        }
        if (!token) {
          const custom = hs?.headers?.token as string | undefined;
          if (custom && custom.trim()) token = custom.trim();
        }
        if (!token && process.env.NODE_ENV !== 'production') {
          const q = hs?.query?.token as string | undefined;
          if (q && q.trim()) token = q.trim();
        }
        if (!token) return next(new Error('Token missing'));
        const payload: any = await this.jwt.verifyAsync(token); // ✅ works now
        const userId: string | undefined = payload?.sub ?? payload?.userId ?? payload?.id;
        if (!userId) return next(new Error('User id missing'));

        socket.data.userId = userId;
        return next();
      } catch (e: any) {
        return next(new Error(e?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'));
      }
    });
  }

  handleConnection(client: Socket) {
    const uid = client.data?.userId as string | undefined;
    console.log('[WS] connected userId=', uid);
    if (!uid) return client.disconnect(true);
    client.join(`user:${uid}`);
    client.emit('connected', { ok: true });
  }

  handleDisconnect(client: Socket) {
    console.log('testing disconnect');
    const uid = client.data?.userId as string | undefined;
    if (uid) this.presence.offline(uid);
  }

  @SubscribeMessage('screen_state')
  async onScreenState(
    @ConnectedSocket() client: Socket,
    @MessageBody() p: { screen: 'chat' | 'other'; conversationId?: string },
  ) {
    const uid = client.data.userId as string;
    console.log(uid, '++++');
    if (!uid) return;
    if (p.screen === 'chat' && p.conversationId) {
      this.presence.setActiveConversation(uid, p.conversationId);
    } else {
      this.presence.setActiveConversation(uid, null);
    }
    return { ok: true };
  }

  // @SubscribeMessage('send_message')
  // async onSend(@ConnectedSocket() client: Socket, @MessageBody() dto: SendMessageDto) {
  //   console.log('testing Convo');
  //   const { userId } = client.data as any;
  //   console.log(userId,"userIduserIduserId")
  //   const { conversationId, message } = await this.provider.sendMessage(userId, dto);
  //   this.emitter.toUser(dto.recipientId, 'new_message', { conversationId, message });
  //   return { conversationId, message };
  // }

  @SubscribeMessage('send_message')
  async onSend(@ConnectedSocket() client: Socket, @MessageBody() dto: SendMessageDto) {
    const { userId } = client.data as any;

    // ✅ provider.sendMessage already emits 'send_message' to BOTH users internally
    // Don't emit again here — that causes double messages
    const { conversationId, message } = await this.provider.sendMessage(userId, dto);

    // ✅ Just return the ack to the sender (optional, for confirmation)
    return { conversationId, message };
  }
}
