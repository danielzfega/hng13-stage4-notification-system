export interface PushNotificationPayload {
  notification_id: string;
  user_id: string;
  device_tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: string;
  retries?: number;
  created_at?: string;
  image_url?: string;
  click_action?: string;
}

export interface FCMResponse {
  success: boolean;
  notification_id: string;
  sent_count: number;
  failed_count: number;
  failures?: Array<{
    token: string;
    error: string;
  }>;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}
