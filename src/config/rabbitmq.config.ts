import { registerAs } from '@nestjs/config';

export default registerAs('rabbitmq', () => ({
  uri: process.env.RABBITMQ_URI || 'amqp://guest:guest@localhost:5672',
  exchange: process.env.RABBITMQ_EXCHANGE || 'notifications.direct',
  email_queue: process.env.EMAIL_QUEUE || 'email.queue',
  push_queue: process.env.PUSH_QUEUE || 'push.queue',
  failed_queue: process.env.FAILED_QUEUE || 'failed.queue',
}));
