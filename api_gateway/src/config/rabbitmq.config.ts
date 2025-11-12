import { registerAs } from '@nestjs/config';

export default registerAs('rabbitmq', () => ({
  url: process.env.RABBITMQ_URL,
  exchange: process.env.EXCHANGE,
  emailQueue: process.env.EMAIL_QUEUE,
  pushQueue: process.env.PUSH_QUEUE,
}));
