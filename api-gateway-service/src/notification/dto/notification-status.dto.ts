export enum NotificationStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
}

export class NotificationStatusDto {
  notification_id: string;
  status: NotificationStatus;
  timestamp?: Date;
  error?: string;
}
