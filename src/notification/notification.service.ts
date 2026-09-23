import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PushNotificationDto } from './dto/pushNotification.dto';

@Injectable()
export class NotificationService {
  constructor() {
    if (!admin.apps.length) {
      this.initializeApp();
    }
  }

  initializeApp() {
    const projectId = process.env.FIREBASE_APP_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_APP_CLIENT_EMAIL;
    // --env-file / Jenkins se aane wali key me literal \n hota hai — use asli newline banao
    const privateKey = process.env.FIREBASE_APP_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      Logger.warn(
        '[NotificationService] Firebase env missing — skipping Firebase init (push notifications disabled)',
      );
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  async sendNotifications(
    notification: PushNotificationDto,
    tokens: string[],
    data?: { [key: string]: string },
  ) {
    if (!tokens.length) return;

    // Agar Firebase init nahi hua (key missing), to safely skip
    if (!admin.apps.length) {
      Logger.warn('[NotificationService] Firebase not initialized — skipping push');
      return;
    }

    const payload: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data,
      android: { priority: 'high' },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default' } },
      },
      webpush: {
        headers: { Urgency: 'high' },
        fcmOptions: { link: data?.deepLink || '/' },
        notification: {
          title: notification.title,
          body: notification.body,
          icon: '/icons/push.png',
          badge: '/icons/badge.png',
          actions: [{ action: 'open', title: 'Open' }],
        },
      },
    };

    const res = await admin.messaging().sendEachForMulticast(payload);
    Logger.log(`push success=${res.successCount} fail=${res.failureCount}`);
  }
}