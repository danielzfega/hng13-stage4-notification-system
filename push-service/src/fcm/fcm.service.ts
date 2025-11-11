import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import * as fs from 'fs';
import {
  PushNotificationPayload,
  FCMResponse,
} from '../common/interfaces/push-notification.interface';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(
    private configService: ConfigService,
    private circuitBreaker: CircuitBreakerService,
  ) {}

  async onModuleInit() {
    try {
      const serviceAccountPath = this.configService.get<string>(
        'FCM_SERVICE_ACCOUNT_PATH',
      );

      if (!serviceAccountPath) {
        throw new Error('FCM_SERVICE_ACCOUNT_PATH is not configured');
      }

      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(
          `Firebase service account file not found at: ${serviceAccountPath}`,
        );
      }

      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, 'utf8'),
      ) as ServiceAccount;

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
      throw error;
    }
  }

  async sendPushNotification(
    payload: PushNotificationPayload,
  ): Promise<FCMResponse> {
    try {
      return await this.circuitBreaker.execute(async () => {
        const { device_tokens, title, body, data, priority, image_url, click_action } = payload;

        if (!device_tokens || device_tokens.length === 0) {
          throw new Error('No device tokens provided');
        }

        const message = {
          tokens: device_tokens,
          notification: {
            title,
            body,
            ...(image_url && { imageUrl: image_url }),
          },
          data: {
            notification_id: payload.notification_id,
            ...(data || {}),
          },
          android: {
            priority: this.mapPriority(priority),
            notification: {
              ...(click_action && { clickAction: click_action }),
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
          webpush: {
            notification: {
              ...(click_action && { clickAction: click_action }),
            },
          },
        };

        this.logger.log(
          `Sending push notification to ${device_tokens.length} device(s)`,
        );

        const response = await admin.messaging().sendEachForMulticast(message);

        const failures = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failures.push({
              token: device_tokens[idx],
              error: resp.error?.message || 'Unknown error',
            });
            this.logger.warn(
              `Failed to send to token ${device_tokens[idx]}: ${resp.error?.message}`,
            );
          }
        });

        const fcmResponse: FCMResponse = {
          success: response.successCount > 0,
          notification_id: payload.notification_id,
          sent_count: response.successCount,
          failed_count: response.failureCount,
          ...(failures.length > 0 && { failures }),
        };

        this.logger.log(
          `Push notification ${payload.notification_id}: ${response.successCount} sent, ${response.failureCount} failed`,
        );

        return fcmResponse;
      });
    } catch (error) {
      this.logger.error(
        `Error sending push notification ${payload.notification_id}: ${error.message}`,
      );
      throw error;
    }
  }

  private mapPriority(priority?: string): 'high' | 'normal' {
    if (priority === 'high') {
      return 'high';
    }
    return 'normal';
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await admin.messaging().send(
        {
          token,
          data: { test: 'validation' },
        },
        true, // dryRun
      );
      return !!response;
    } catch (error) {
      this.logger.warn(`Invalid FCM token: ${error.message}`);
      return false;
    }
  }
}
