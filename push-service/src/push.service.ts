import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { createClient } from 'redis';
import * as fs from 'fs';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private redis;
  private circuitOpen = false;
  private failureCount = 0;
  private readonly failThreshold = 5;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    // Initialize Firebase
    const serviceAccountPath = this.config.get('FCM_SERVICE_ACCOUNT_PATH', './firebase-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        this.logger.log('Firebase initialized');
      }
    } else {
      this.logger.error('Firebase service account not found');
    }

    // Initialize Redis
    this.redis = createClient({
      socket: {
        host: this.config.get('REDIS_HOST', 'localhost'),
        port: this.config.get('REDIS_PORT', 6379),
      },
    });
    
    await this.redis.connect();
    this.logger.log('Redis connected');
  }

  async sendPush(payload: any): Promise<any> {
    const { notification_id, device_tokens, title, body, data, priority, image_url } = payload;

    // Check idempotency
    const processed = await this.redis.exists(`push:${notification_id}`);
    if (processed) {
      this.logger.warn(`Notification ${notification_id} already processed`);
      return { success: true, message: 'Already processed' };
    }

    // Circuit breaker check
    if (this.circuitOpen) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const message = {
        tokens: device_tokens,
        notification: { title, body, ...(image_url && { imageUrl: image_url }) },
        data: { notification_id, ...(data || {}) },
        android: { priority: (priority === 'high' ? 'high' : 'normal') as 'high' | 'normal' },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Mark as processed
      await this.redis.setEx(`push:${notification_id}`, 86400, '1');
      
      // Reset circuit breaker on success
      this.failureCount = 0;
      this.circuitOpen = false;

      this.logger.log(`Sent to ${response.successCount} devices`);
      
      return {
        success: true,
        sent_count: response.successCount,
        failed_count: response.failureCount,
      };
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.failThreshold) {
        this.circuitOpen = true;
        this.logger.error('Circuit breaker opened');
        setTimeout(() => {
          this.circuitOpen = false;
          this.failureCount = 0;
        }, 30000);
      }
      throw error;
    }
  }

  getHealth() {
    return {
      service: 'push-service',
      status: 'up',
      circuit_breaker: this.circuitOpen ? 'OPEN' : 'CLOSED',
    };
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // Dry run to validate token without sending
      await admin.messaging().send(
        {
          token,
          data: { test: 'validation' },
        },
        true, // dryRun = true
      );
      this.logger.log(`Token validated successfully`);
      return true;
    } catch (error) {
      this.logger.warn(`Invalid token: ${error.message}`);
      return false;
    }
  }

  updateNotificationStatus(statusData: any): void {
    this.logger.log(`Status update: ${statusData.notification_id} -> ${statusData.status}`);
    // In a real implementation, this would publish to a status queue or update a database
    // For now, we just log it
  }
}
