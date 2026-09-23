import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ConversationRepository } from './repositories/conversation.repository';
import { ParticipantRepository } from './repositories/participant.repository';
import { MessageRepository } from './repositories/message.repository';
import { MessageAttachmentRepository } from './repositories/message-attachment.repository';
import { SendMessageDto } from './dto/send-message.dto';
import { PushNotificationDto } from '../notification/dto/pushNotification.dto';
import { UserProvider } from '../user/user.provider';
import { NotificationProvider } from '../notification/notification.provider';
import { Message } from './entities/message.entity';
import { NotificationTypes } from '../lib/enums/notification.enum';
import { SendNotificationParams } from '../notification/notification.interface';
import { PresenceService } from '../realtime/presence.service';
import { WsEmitterService } from '../realtime/ws-emitter.service';
import { UserRoles } from '../lib/enums/user.enum';
import { InterestService } from '../interest/interest.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ConversationPermanentRepository } from './repositories/conversation-permanent.repository';
import { EmailService } from '../services/mail.service';

@Injectable()
export class ChatProvider {
    private readonly logger = new Logger(ChatProvider.name);

  constructor(
    private readonly logic: ChatService,
    private readonly convRepo: ConversationRepository,
    private readonly convParRepo: ConversationPermanentRepository,
    private readonly partRepo: ParticipantRepository,
    private readonly msgRepo: MessageRepository,
    private readonly attRepo: MessageAttachmentRepository,
    private readonly emitter: WsEmitterService,
    private readonly presence: PresenceService,
    private readonly userProvider: UserProvider,
    private readonly notificationProvider: NotificationProvider,

    private readonly interestService: InterestService,
    private readonly subscriptionService: SubscriptionService,
    private readonly emailService: EmailService,
  ) { }
  private async ensureConversation(
    currentUserId: string,
    otherUserId: string,
    subscriptionId?: number,
  ) {
    const key = this.logic.pairKey(currentUserId, otherUserId);
    let conv = await this.convRepo.findByPairKey(key);
    if (!conv) conv = await this.convRepo.createAndSave(key);
    let convPer = await this.convParRepo.findByPairKey(key);
    if (!convPer && subscriptionId)
      convPer = await this.convParRepo.createAndSave(key, subscriptionId);
    await Promise.all([
      this.partRepo.upsertParticipant(conv.id, currentUserId),
      this.partRepo.upsertParticipant(conv.id, otherUserId),
    ]);
    return conv;
  }

  async sendMessage(currentUserId: string, dto: SendMessageDto) {
    console.log('[Chat] sendMessage sender:', currentUserId, 'recipient:', dto.recipientId);
    const hasText = !!dto.body?.trim();
    const hasFiles = !!dto.files?.length;
    if (!hasText && !hasFiles) throw new BadRequestException('Either body or files[] is required');

    // 1. Get subscription limit
    const chatLimit = await this.subscriptionService.getFeatureLimit(currentUserId, 11);

    const conv = await this.ensureConversation(currentUserId, dto.recipientId, chatLimit?.id);
    await Promise.all([
      this.partRepo.restoreForUser(conv.id, currentUserId),
      this.partRepo.restoreForUser(conv.id, dto.recipientId),
    ]);

    const payload = hasFiles
      ? this.logic.buildAttachmentPayload(
        conv.id,
        currentUserId,
        dto.recipientId,
        dto.body?.trim() ?? null,
      )
      : this.logic.buildTextPayload(conv.id, currentUserId, dto.recipientId, dto.body!.trim());

    const parent = await this.msgRepo.createMessage(payload);

    if (hasFiles) {
      await this.attRepo.createMany(
        parent.id,
        dto.files!.map((f) => ({
          type: f.type,
          url: f.url,
          thumbnailUrl: f.thumbnailUrl ?? null,
          mime: f.mime ?? null,
          filename: f.filename ?? null,
          size: f.size != null ? String(f.size) : null,
          width: f.width ?? null,
          height: f.height ?? null,
          pages: f.pages ?? null,
          duration: f.duration ?? null,
        })),
      );
    }

    await this.partRepo.incrementUnread(conv.id, dto.recipientId, 1);

    const message = await this.msgRepo.findById(parent.id);
    if (!message) throw new NotFoundException('Message not found');

    // 🔥 Emit to both users for real-time chat
    this.emitter.toUser(dto.recipientId, 'send_message', message);
    this.emitter.toUser(currentUserId, 'send_message', message);

    this.notifyOnNewMessage(currentUserId, dto.recipientId, message).catch((e) =>
      console.log('[Chat] notifyOnNewMessage FAILED:', e?.message, e),
    );

    return { conversationId: conv.id, message };
  }

 async requestAssistedSearch(
  companyUserId: string,
  customMessage?: string,
) {

  const admins =
    await this.userProvider.findAllByRole(
      UserRoles.SUPER_ADMIN,
    );


  console.log(
    '[Chat] assistedSearch admins found:',
    admins?.length ?? 0,
    admins?.map((a) => a.id),
  );


  if (!admins || admins.length === 0) {
    throw new NotFoundException(
      'Admin not found',
    );
  }


  const companyUser =
    await this.userProvider.findOneWithProfile(
      companyUserId,
    );


  const companyName =
    companyUser?.company?.name ||
    companyUser?.username ||
    'A company';


  const messageBody =
    customMessage?.trim()
      ? customMessage.trim()
      : `Hi, I'm requesting assisted search support. Please help me find the right candidates.`;



  let primaryConversationId: string | null = null;
  let primaryAdminId: string | null = null;
  let primaryMessage: any = null;



  for (const admin of admins) {


    const conv =
      await this.ensureConversation(
        companyUserId,
        admin.id,
      );


    await Promise.all([
      this.partRepo.restoreForUser(
        conv.id,
        companyUserId,
      ),

      this.partRepo.restoreForUser(
        conv.id,
        admin.id,
      ),
    ]);



    if (!primaryConversationId) {

      primaryConversationId = conv.id;
      primaryAdminId = admin.id;

    }



    const [existingMessages] =
      await this.msgRepo.list(
        companyUserId,
        conv.id,
        0,
        1,
      );



    console.log(
      '[AssistedSearch] existing messages',
      {
        adminId: admin.id,
        count: existingMessages.length,
      },
    );



    if (existingMessages.length > 0) {
      continue;
    }



    const payload =
      this.logic.buildTextPayload(
        conv.id,
        companyUserId,
        admin.id,
        messageBody,
      );



    const parent =
      await this.msgRepo.createMessage(
        payload,
      );



    await this.partRepo.incrementUnread(
      conv.id,
      admin.id,
      1,
    );



    const message =
      await this.msgRepo.findById(
        parent.id,
      );


    if (!message) {
      continue;
    }



    console.log(
      '[Chat] assistedSearch message sent to admin:',
      admin.id,
    );



    this.emitter.toUser(
      admin.id,
      'send_message',
      message,
    );


    this.emitter.toUser(
      companyUserId,
      'send_message',
      message,
    );



    this.notifyOnNewMessage(
      companyUserId,
      admin.id,
      message,
    ).catch((e) =>
      console.log(
        '[Chat] assistedSearch notify FAILED:',
        e?.message,
      ),
    );



    if (!primaryMessage) {
      primaryMessage = message;
    }

  }



  // ALWAYS SEND EMAIL
  await this.sendAssistedSearchEmail(
    companyName,
    messageBody,
    companyUser?.email,
  );



  return {

    conversationId:
      primaryConversationId,

    adminId:
      primaryAdminId,

    message:
      primaryMessage,

  };

}


private async sendAssistedSearchEmail(
  companyName: string,
  messageBody: string,
  companyEmail?: string,
) {
  try {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Assisted Search Request</title>
</head>

<body style="
margin:0;
padding:0;
background:#f5f7fa;
font-family:Arial,Helvetica,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:40px 15px;">

<table width="600"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
border-radius:12px;
overflow:hidden;
">

<tr>
<td style="
background:#022A45;
padding:25px;
text-align:center;
color:white;
">

<h1 style="margin:0;">
Seamfox
</h1>

</td>
</tr>


<tr>
<td style="
padding:30px;
color:#1f2937;
font-size:15px;
line-height:1.6;
">

<h2 style="
color:#022A45;
margin-top:0;
">
New Assisted Search Request
</h2>


<p>
Hi Search Assist Team,
</p>


<p>
<strong>${companyName}</strong>
is requesting your help and has sent the following message:
</p>


<div style="
background:#f1f5f9;
border-left:4px solid #022A45;
padding:15px;
margin:20px 0;
border-radius:6px;
">

"${messageBody}"

</div>


${
  companyEmail
    ? `
<p>
Company Email:
<a href="mailto:${companyEmail}">
${companyEmail}
</a>
</p>
`
    : ''
}


<p>
Please log in to the Seamfox admin panel to respond to this request.
</p>


<p>
Best regards,
<br>
<strong>Seamfox Platform</strong>
</p>


</td>
</tr>


<tr>
<td style="
background:#f8fafc;
padding:15px;
text-align:center;
font-size:12px;
color:#64748b;
">

© ${new Date().getFullYear()} Seamfox

</td>
</tr>


</table>

</td>
</tr>
</table>


</body>
</html>
`;

    this.logger.log(
      `[Assisted Search Email] Sending to SearchAssist`,
    );


    await this.emailService.send({
      to: 'SearchAssist@seamfox.com',
      subject: `${companyName} is requesting Assisted Search`,
      html,
    });


    this.logger.log(
      `[Assisted Search Email] Sent successfully`,
    );


  } catch (error: any) {

    this.logger.error(
      `[Assisted Search Email] Failed: ${error?.message}`,
      error?.stack,
    );

    throw error;
  }
}


  async listMessages(
    role: string,
    currentUserId: string,
    conversationId: string,
    page = 1,
    limit = 100,
  ) {
    if (role === 'CANDIDATE') {
      const checkChatAcess = await this.subscriptionService.getFeatureLimit(currentUserId, 17);

      if (!checkChatAcess) {
        throw new BadRequestException(
          'Your current subscription plan does not allow access to chat feature. Please upgrade your plan to access this feature.',
        );
      }
    }

    const conv = await this.convRepo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');

    const isArchived = await this.partRepo.isDeletedForUser(conversationId, currentUserId);
    if (isArchived) throw new NotFoundException('Conversation not found');

    page = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    limit = Number.isFinite(+limit) ? Math.max(1, Math.min(100, +limit)) : 100;

    const offset = (page - 1) * limit;
    const [rowsDesc, total] = await this.msgRepo.list(currentUserId, conversationId, offset, limit);
    const rows = this.logic.toAscending(rowsDesc);
    return {
      rows,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async listInbox(currentUserId: string, page = 1, limit = 20, search?: string) {
    page = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    limit = Number.isFinite(+limit) ? Math.max(1, Math.min(100, +limit)) : 20;
    const offset = (page - 1) * limit;

    const [rows, total] = await this.convRepo.inbox(currentUserId, offset, limit, search);
    return {
      rows,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async listArchivedInbox(userId: string, page = 1, limit = 20, search?: string) {
    const offset = (page - 1) * limit;
    const [rows, total] = await this.convRepo.archivedInbox(userId, offset, limit, search);

    return {
      rows,
      meta: { page, limit, total },
    };
  }

  async deleteConversationForMe(currentUserId: string, conversationId: string) {
    const ok = await this.partRepo.isParticipant(conversationId, currentUserId);
    if (!ok) throw new ForbiddenException('Not a participant');
    // await this.partRepo.softDeleteForUser(conversationId, currentUserId);

    // 🔥 1. Delete all attachments
    await this.attRepo.deleteByConversation(conversationId);

    // 🔥 2. Delete all messages
    await this.msgRepo.deleteByConversation(conversationId);

    // 🔥 3. Delete participants
    await this.partRepo.deleteByConversation(conversationId);

    // 🔥 4. Delete conversation
    await this.convRepo.deleteConversation(conversationId);

    return { ok: true };
  }

  async archiveConversation(userId: string, conversationId: string) {
    const participant = await this.partRepo.findParticipant(conversationId, userId);
    if (!participant) throw new ForbiddenException('Not a participant');

    const user = await this.userProvider.findOne(userId);

    if (user?.role !== UserRoles.COMPANY) {
      throw new ForbiddenException('Only company can end conversation');
    }

    await this.partRepo.archiveForUser(conversationId, userId);

    await this.partRepo.lockOtherParticipant(conversationId, userId);

    return { ok: true };
  }

  async restoreConversationForMe(userId: string, conversationId: string) {
    const participant = await this.partRepo.findParticipant(conversationId, userId);
    if (!participant) throw new ForbiddenException();

    const user = await this.userProvider.findOne(userId);
    if (user?.role !== UserRoles.COMPANY) {
      throw new ForbiddenException();
    }

    await this.partRepo.restoreForUser(conversationId, userId);

    await this.partRepo.unlockOtherParticipant(conversationId, userId);

    return { ok: true };
  }

  // async restoreConversationForMe(currentUserId: string, conversationId: string) {
  //   const ok = await this.partRepo.isParticipant(conversationId, currentUserId);
  //   if (!ok) throw new ForbiddenException('Not a participant');
  //   await this.partRepo.restoreForUser(conversationId, currentUserId);
  //   return { ok: true };
  // }

  private buildPreview(senderName: string, m: Message) {
    if ((m as any).kind === 'text') {
      return `${senderName}: ${(m.body || '').toString().slice(0, 80)}`;
    }
    const tags =
      (m.attachments || [])
        .map((a: any) => a.type)
        .slice(0, 3)
        .join(', ') || 'attachment';
    const cap = (m.body || '').toString().trim();
    return `${senderName}: [${tags}]${cap ? ' — ' + cap.slice(0, 60) : ''}`;
  }

  private emitBell(recipientId: string, m: Message) {
    this.emitter.toUser(recipientId, 'bell', {
      type: 'chat',
      conversationId: m.conversationId,
      messageId: m.id,
      snippet:
        (m.body && m.body.toString().slice(0, 80)) ||
        (m.attachments?.length ? `[${m.attachments[0].type}]` : ''),
      at: m.createdAt,
    });
  }
private async notifyOnNewMessage(
  senderId: string,
  recipientId: string,
  message: any,
) {
  try {
    const isOnline = this.presence.isOnline(recipientId);

    const isActiveHere =
      isOnline &&
      this.presence.isActiveInConversation(
        recipientId,
        message.conversationId,
      );

    if (isActiveHere) {
      return;
    }


    const sender =
      await this.userProvider.findOneWithProfile(senderId);


    const recipient =
      await this.userProvider.findOneWithProfile(recipientId);



    // =========================
    // Sender Name
    // =========================

    let senderName = 'Someone';


    if (sender?.role === UserRoles.COMPANY) {

      senderName =
        sender.company?.name ||
        sender.username ||
        'A company';

    } else if (sender?.role === UserRoles.CANDIDATE) {

      senderName =
        `${sender.candidate?.firstName ?? ''} ${
          sender.candidate?.lastName ?? ''
        }`.trim() ||
        sender.username ||
        'A candidate';

    } else if (
      sender?.role === UserRoles.SUPER_ADMIN ||
      sender?.role === UserRoles.MODERATOR
    ) {

      senderName = 'Seamfox Support';

    }



    // =========================
    // Email
    // =========================


    const recipientEmail =
      recipient?.email;



    if (recipientEmail) {


      const firstName =
        recipient?.candidate?.firstName ||
        recipient?.company?.name ||
        recipient?.username ||
        'there';



      // const messagesUrl =
      //   `${process.env.APP_DEEP_LINK_BASE || 'https://staging-portal.seamfox.com'}/messages`;
      const messagesUrl = 'https://staging-portal.seamfox.com/messages';



      const messageText =
        message?.body ||
        'You have received a new message on Seamfox.';



      const html = `

<!DOCTYPE html>

<html>

<body style="
margin:0;
background:#f6f8fb;
font-family:Arial,Helvetica,sans-serif;
">


<table width="100%" cellpadding="0" cellspacing="0">

<tr>

<td align="center" style="padding:40px 20px">


<table width="600"

style="
background:white;
border-radius:12px;
overflow:hidden;
">


<tr>

<td style="
background:#022A45;
padding:25px;
text-align:center;
">

<h1 style="
color:white;
margin:0;
font-size:24px;
">

Seamfox

</h1>


</td>

</tr>



<tr>

<td style="
padding:35px;
color:#1f2937;
font-size:15px;
line-height:1.6;
">


<h2 style="
color:#022A45;
">

New Message on Seamfox

</h2>



<p>
Hi ${firstName},
</p>



<p>

<strong>${senderName}</strong>
has sent you a new message on Seamfox.

</p>



<div style="
background:#f1f5f9;
padding:18px;
border-radius:8px;
margin:25px 0;
color:#334155;
">

${messageText}

</div>



<p>

Log in to Seamfox to read the message and reply.

</p>



<div style="
text-align:center;
margin:30px 0;
">


<a href="${messagesUrl}"

style="
background:#022A45;
color:white;
padding:14px 28px;
border-radius:6px;
text-decoration:none;
font-weight:bold;
">

View Messages

</a>


</div>



<p>

Need help?

<br/>

Contact our support team at

<a href="mailto:support@seamfox.com">

support@seamfox.com

</a>

</p>



<p>

— The Seamfox Team

</p>



</td>

</tr>



<tr>

<td style="
background:#f8fafc;
padding:15px;
text-align:center;
font-size:12px;
color:#64748b;
">


© ${new Date().getFullYear()} Seamfox · Commodity Talent Platform


</td>

</tr>



</table>


</td>

</tr>

</table>


</body>

</html>

`;



      await this.emailService.send({

        to: recipientEmail,

        subject:
          `New message from ${senderName} on Seamfox`,

        html,

      });



      this.logger.log(
        `[CHAT EMAIL] Sent successfully recipient=${recipientEmail}`,
      );


    } else {


      this.logger.warn(
        `[CHAT EMAIL] Missing email recipientId=${recipientId}`,
      );


    }



    // =========================
    // Notification
    // =========================


    const notification: PushNotificationDto = {

      title:
        `New message from ${senderName}`,

      body:
        this.buildPreview(senderName, message),

    };



    const metadata = {

      conversationId:
        message.conversationId,

      messageId:
        message.id,

      fromUserId:
        senderId,

    };



    const deepLink = `'https://staging-portal.seamfox.com/messages'}?conversation=${message.conversationId}`;



    if (isOnline) {


      this.emitBell(
        recipientId,
        message,
      );


      await this.notificationProvider.createNotifications([

        {

          title:
            notification.title,

          body:
            notification.body,

          recipientId,

          senderId,

          type:
            NotificationTypes.CHAT_MESSAGE,

          metadata,

        },

      ]);



      return;

    }



    await this.notificationProvider.sendNotifications({

      recipientIds:[
        recipientId,
      ],


      notification,


      dataPayload:{

        conversationId:
          message.conversationId,

        messageId:
          message.id,

        fromUserId:
          senderId,

        deepLink,

      },


      senderId,


      metadata,


      type:
        NotificationTypes.CHAT_MESSAGE,


      senderName,

    });



  } catch(error:any){


    this.logger.error(
      `[CHAT NOTIFICATION FAILED] ${error?.message}`,
      error?.stack,
    );


  }

}



  async markAsSeen(userId: string, conversationId: string) {
    // only mark messages where user is recipient and not already seen
    await this.msgRepo.markSeen(conversationId, userId);

    // reset unread counter for that user
    await this.partRepo.resetUnread(conversationId, userId);

    // emit event so sender also sees "seen"
    this.emitter.toUser(userId, 'messages_seen', { conversationId });

    return { ok: true };
  }

  async checkChatAccess(companyUserId: string) {
    // 1. Get subscription limit
    const chatLimit = await this.subscriptionService.getFeatureLimit(companyUserId, 11);

    if (!chatLimit) {
      return { allowed: true };
    }

    if (chatLimit.limit?.toLowerCase() === 'unlimited') {
      return { allowed: true };
    }

    const limit = Number(chatLimit?.limit);

    // 2. Count conversations where company is second part of pairKey
    const conversationCount = await this.convParRepo.countCompanyConversations(
      companyUserId,
      chatLimit?.id,
    );

    // if (conversationCount >= limit) {
    //   throw new BadRequestException(
    //     `Your subscription plan allows ${limit} chat conversations, and you have already used all of them. Please upgrade your plan to continue messaging candidates.`,
    //   );
    // }

    return {
      allowed: true,
      limit,
      used: conversationCount,
      remaining: limit - conversationCount,
    };
  }

  async adminListAllConversations(page = 1, limit = 20, search?: string) {
    page = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    limit = Number.isFinite(+limit) ? Math.max(1, Math.min(100, +limit)) : 20;
    const offset = (page - 1) * limit;

    const [rows, total] = await this.convRepo.adminInbox(offset, limit, search);
    return { rows, meta: { page, limit, total } };
  }

  // ✅ Admin — read messages of any conversation (bypass participant check)
  async adminListMessages(conversationId: string, page = 1, limit = 100) {
    const conv = await this.convRepo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');

    page = Number.isFinite(+page) ? Math.max(1, +page) : 1;
    limit = Number.isFinite(+limit) ? Math.max(1, Math.min(100, +limit)) : 100;
    const offset = (page - 1) * limit;

    const adminViewerId = conv.pairKey?.split(':')?.[0] ?? '';

    const [rowsDesc, total] = await this.msgRepo.list(adminViewerId, conversationId, offset, limit);
    const rows = this.logic.toAscending(rowsDesc);
    return { rows, meta: { page, limit, total } };
  }
}