# Push Service

Push notification microservice using Firebase Cloud Messaging (FCM) and RabbitMQ.

## Features

- FCM push notifications
- RabbitMQ message queue consumer
- Redis idempotency
- Circuit breaker pattern
- Automatic retries with exponential backoff
- Dead letter queue for failed messages

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Add Firebase credentials**:
Place your `firebase-service-account.json` in this directory.

3. **Configure environment**:
Copy `.env.example` to `.env` and update if needed.

4. **Run**:
```bash
npm run start:dev
```

## Testing

### Start infrastructure:
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Run automated tests:
```bash
chmod +x test-push-service.sh
./test-push-service.sh
```

### Manual test:
```bash
curl http://localhost:3003/health
```

## Message Format

Send messages to `push.queue`:

```json
{
  "notification_id": "uuid",
  "user_id": "string",
  "device_tokens": ["fcm_token"],
  "title": "Title",
  "body": "Message body",
  "data": {},
  "priority": "high",
  "retries": 0
}
```

## Environment Variables

See `.env.example` for all configuration options.

## Docker

Build:
```bash
docker build -t push-service .
```

Run with docker-compose:
```bash
docker-compose up push-service
```
