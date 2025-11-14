import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  EMAIL = "email",
  PUSH = "push",
}

export enum NotificationStatus {
  DELIVERED = "delivered",
  PENDING = "pending",
  FAILED = "failed",
}
