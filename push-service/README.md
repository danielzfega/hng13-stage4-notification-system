# Push Notification Service 📱

A robust, production-ready push notification microservice built with NestJS and Firebase Cloud Messaging (FCM). This service is part of a distributed notification system that handles mobile and web push notifications asynchronously through message queues.

## 🚀 Features

- ✅ **Firebase Cloud Messaging (FCM)** integration for cross-platform push notifications
- ✅ **RabbitMQ** message queue consumer with automatic retry logic
- ✅ **Circuit Breaker** pattern to prevent cascading failures
- ✅ **Idempotency** using Redis to prevent duplicate notifications
- ✅ **Exponential Backoff** retry mechanism
- ✅ **Health Check** endpoints for monitoring and orchestration
- ✅ **Docker** support for containerized deployment
- ✅ **Comprehensive Testing** with unit and e2e tests
- ✅ **Dead Letter Queue** for failed notifications
- ✅ **Token Validation** endpoint
- ✅ **Rich Notifications** support (images, actions, data payloads)

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Service](#running-the-service)
- [Testing](#testing)
- [API Endpoints](#api-endpoints)
- [Message Queue Format](#message-queue-format)
- [Docker Deployment](#docker-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture

```
┌─────────────────┐
│  Gateway/API    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   RabbitMQ      │
│  push.queue     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Push Service   │────▶│    Redis     │
│  (This Service) │     │ (Idempotency)│
└────────┬────────┘     └──────────────┘
         │
         ▼
┌─────────────────┐
│      FCM        │
│  (Firebase)     │
└─────────────────┘
```

### Key Components

1. **Queue Consumer**: Listens to RabbitMQ `push.queue` for incoming push notification requests
2. **FCM Service**: Sends push notifications via Firebase Cloud Messaging
3. **Circuit Breaker**: Protects against FCM service failures
4. **Redis Service**: Provides idempotency checks and caching
5. **Health Endpoints**: Monitor service status and readiness

## 📦 Prerequisites

- **Node.js** >= 20.x
- **npm** >= 9.x
- **RabbitMQ** >= 3.x (or Docker)
- **Redis** >= 7.x (or Docker)
- **Firebase Project** with Cloud Messaging enabled
- **Firebase Service Account** JSON file

### Getting Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `firebase-service-account.json` in the `push-service` directory

## 🛠️ Installation

### 1. Clone and Navigate

```bash
cd push-service
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#configuration) section).

### 4. Add Firebase Credentials

Place your `firebase-service-account.json` file in the `push-service` directory.

## ⚙️ Configuration

Create a `.env` file with the following variables:

```env
# Service Configuration
NODE_ENV=development
PORT=3003
SERVICE_NAME=push-service
LOG_LEVEL=info

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=notifications.direct
RABBITMQ_PUSH_QUEUE=push.queue
RABBITMQ_FAILED_QUEUE=failed.queue
RABBITMQ_PREFETCH_COUNT=10

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_IDEMPOTENCY_TTL=86400

# Firebase Cloud Messaging (FCM)
FCM_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Circuit Breaker Configuration
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Retry Configuration
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_BASE=1000
RETRY_BACKOFF_MAX=30000
```

## 🏃 Running the Service

### Development Mode

```bash
npm run start:dev
```

The service will start on `http://localhost:3003`

### Production Mode

```bash
npm run build
npm run start:prod
```

### Using Docker Compose (Recommended)

From the root of the project:

```bash
docker-compose up push-service
```

This will automatically start RabbitMQ, Redis, and the push service.

## 🧪 Testing

### Prerequisites for Testing

1. **Test FCM Token**: You need a valid FCM device token. You can get one by:
   - Building a simple mobile app (React Native/Flutter/Native Android/iOS)
   - Using the Firebase Console to get a test token
   - Your provided token: `dwqV_8wPQNumjDUPb40bMg:APA91bGcgOVpt2A8GdhRdDA6h6cHN_t-j4bRt3jtFqhJzmEvtfEJilfGMzJDZrM7moYbm__Gay1SEnYLQvdpfiIshzW9TInkaWoHrY7tSqZdBsXj728teUQ`

2. **Start Dependencies**:

```bash
# Start RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine

# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Run Unit Tests

```bash
npm test
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Run Tests with Coverage

```bash
npm run test:cov
```

### Manual Testing

#### 1. Validate FCM Token

```bash
curl -X POST http://localhost:3003/push/validate-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "dwqV_8wPQNumjDUPb40bMg:APA91bGcgOVpt2A8GdhRdDA6h6cHN_t-j4bRt3jtFqhJzmEvtfEJilfGMzJDZrM7moYbm__Gay1SEnYLQvdpfiIshzW9TInkaWoHrY7tSqZdBsXj728teUQ"
  }'
```

#### 2. Send Test Push Notification

```bash
curl -X POST http://localhost:3003/push/test \
  -H "Content-Type: application/json" \
  -d '{
    "device_tokens": ["dwqV_8wPQNumjDUPb40bMg:APA91bGcgOVpt2A8GdhRdDA6h6cHN_t-j4bRt3jtFqhJzmEvtfEJilfGMzJDZrM7moYbm__Gay1SEnYLQvdpfiIshzW9TInkaWoHrY7tSqZdBsXj728teUQ"],
    "title": "Test Notification",
    "body": "Hello from the push service!",
    "priority": "high",
    "data": {
      "redirect_to": "home",
      "severity": "info"
    }
  }'
```

#### 3. Check Health

```bash
curl http://localhost:3003/health
```

## 📡 API Endpoints

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | General health status |
| `/health/ready` | GET | Readiness probe (K8s) |
| `/health/live` | GET | Liveness probe (K8s) |

### Push Notification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/push/test` | POST | Send test push notification |
| `/push/validate-token` | POST | Validate FCM device token |

### Health Response Example

```json
{
  "success": true,
  "message": "Push service is healthy",
  "data": {
    "service": "push-service",
    "status": "up",
    "timestamp": "2025-11-11T10:30:00.000Z",
    "circuit_breaker": {
      "state": "CLOSED",
      "failureCount": 0
    }
  }
}
```

## 📨 Message Queue Format

### Push Notification Message (RabbitMQ)

Messages published to the `push.queue` should follow this format:

```json
{
  "notification_id": "f3b5c1f0-6e4a-4a67-a271-6dc4b4d7f8a1",
  "user_id": "u12345",
  "device_tokens": [
    "dwqV_8wPQNumjDUPb40bMg:APA91bGcgOVpt2A8GdhRdDA6h6cHN_t-j4bRt3jtFqhJzmEvtfEJilfGMzJDZrM7moYbm__Gay1SEnYLQvdpfiIshzW9TInkaWoHrY7tSqZdBsXj728teUQ"
  ],
  "title": "System Maintenance",
  "body": "The dashboard will be offline at 10PM for maintenance.",
  "data": {
    "redirect_to": "maintenance_notice",
    "severity": "info"
  },
  "priority": "high",
  "retries": 0,
  "created_at": "2025-11-11T14:21:37Z",
  "image_url": "https://example.com/image.png",
  "click_action": "OPEN_ACTIVITY"
}
```

### Publishing to Queue (Example)

```javascript
// Example: Publishing from another service
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost:5672');
const channel = await connection.createChannel();

const payload = {
  notification_id: crypto.randomUUID(),
  user_id: 'u12345',
  device_tokens: ['YOUR_FCM_TOKEN'],
  title: 'Hello World',
  body: 'This is a test notification',
  priority: 'high',
  retries: 0,
  created_at: new Date().toISOString()
};

await channel.assertQueue('push.queue', { durable: true });
channel.sendToQueue('push.queue', Buffer.from(JSON.stringify(payload)), { 
  persistent: true 
});
```

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t push-service:latest .
```

### Run Standalone Container

```bash
docker run -d \
  --name push-service \
  -p 3003:3003 \
  -e RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672 \
  -e REDIS_HOST=redis \
  -v $(pwd)/firebase-service-account.json:/app/firebase-service-account.json:ro \
  push-service:latest
```

### Using Docker Compose

The service is already configured in the root `docker-compose.yml`. Simply run:

```bash
docker-compose up -d push-service
```

## 📊 Monitoring

### Logs

View logs in real-time:

```bash
# Docker Compose
docker-compose logs -f push-service

# Docker
docker logs -f push-service

# Local
npm run start:dev
```

### Metrics to Monitor

- **Queue Length**: Check RabbitMQ management UI at `http://localhost:15672`
- **Circuit Breaker State**: Check `/health` endpoint
- **Redis Connection**: Monitor Redis connections
- **FCM Response Times**: Check application logs
- **Error Rates**: Track failed notifications in dead-letter queue

### RabbitMQ Management UI

Access at: `http://localhost:15672`
- Username: `guest`
- Password: `guest`

## 🔧 Troubleshooting

### Issue: Firebase Service Account Not Found

**Solution**: Ensure `firebase-service-account.json` is in the `push-service` directory and the path in `.env` is correct.

### Issue: Cannot Connect to RabbitMQ

**Solution**: 
1. Check if RabbitMQ is running: `docker ps | grep rabbitmq`
2. Verify `RABBITMQ_URL` in `.env`
3. Ensure port 5672 is accessible

### Issue: Cannot Connect to Redis

**Solution**:
1. Check if Redis is running: `docker ps | grep redis`
2. Verify `REDIS_HOST` and `REDIS_PORT` in `.env`
3. Test connection: `redis-cli ping`

### Issue: Push Notifications Not Being Sent

**Solution**:
1. Verify FCM token is valid using `/push/validate-token`
2. Check Firebase project has Cloud Messaging enabled
3. Review logs for FCM errors
4. Check circuit breaker state in `/health` endpoint

### Issue: Circuit Breaker is OPEN

**Solution**:
1. Wait for the reset timeout (default 30 seconds)
2. Check FCM service availability
3. Review recent error logs
4. Circuit breaker will auto-transition to HALF_OPEN state

## 🔐 Security Best Practices

1. **Never commit `firebase-service-account.json`** - It's in `.gitignore`
2. **Use environment variables** for all sensitive configuration
3. **Run as non-root user** in Docker (already configured)
4. **Limit Redis access** - Use authentication in production
5. **Secure RabbitMQ** - Change default credentials
6. **Use HTTPS** - Deploy behind a reverse proxy (nginx/traefik)

## 🎯 Performance Tuning

### Increase Throughput

1. **Adjust `RABBITMQ_PREFETCH_COUNT`**: Higher values = more concurrent processing
2. **Scale horizontally**: Run multiple instances of the service
3. **Optimize FCM batching**: Send to multiple tokens in one request (already implemented)

### Reduce Latency

1. **Lower retry backoff**: Adjust `RETRY_BACKOFF_BASE`
2. **Increase circuit breaker threshold**: Adjust `CIRCUIT_BREAKER_THRESHOLD`
3. **Use Redis cluster**: For distributed deployments

## 📄 License

MIT

## 👥 Contributing

This is part of the HNG Stage 4 Backend Task. For questions or issues, contact the team.

---

**Built with ❤️ using NestJS and Firebase Cloud Messaging**
