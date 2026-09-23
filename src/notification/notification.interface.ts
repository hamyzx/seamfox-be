import { PushNotificationDto } from './dto/pushNotification.dto';
import { Notification } from './entities/notification.entity';

export interface SendNotificationParams {
  recipientIds: string[];
  notification: PushNotificationDto;
  dataPayload?: { [key: string]: string };
  senderId?: string;
  metadata?: Record<string, any>;
  type?: Notification['type'];
  senderName?: string;
}
