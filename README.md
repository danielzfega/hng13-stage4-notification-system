# Distributed Notification System

A microservices-based notification system that sends emails and push notifications asynchronously through message queues.

## 🏗️ Architecture

```
API Gateway → Message Queue (RabbitMQ) → Notification Services
                      ↓
            ┌─────────┼─────────┐
            ↓         ↓         ↓
        Email      Push     Template
       Service    Service    Service
```

## 🔧 Services

### 1. **API Gateway** (NestJS)
- Entry point for all notification requests
- Validates and authenticates requests
- Routes messages to email or push queue
- Tracks notification status

### 2. **User Service** (NestJS)
- Manages user contact info (email, push tokens)
- Stores notification preferences
- Handles authentication and permissions

### 3. **Email Service** (FastAPI)
- Consumes from `email.queue`
- Fills templates with variables
- Sends emails via SMTP/SendGrid/Mailgun
- Tracks delivery confirmations

### 4. **Push Service** (NestJS)
- Consumes from `push.queue`
- Sends notifications via Firebase Cloud Messaging (FCM)
- Validates device tokens
- Supports rich notifications (images, actions, custom data)

### 5. **Template Service** (FastAPI)
- Stores and manages notification templates
- Handles variable substitution
- Supports multiple languages
- Keeps version history

## 📦 Message Queue Setup

**RabbitMQ Structure:**
```
Exchange: notifications.direct
├── email.queue       → Email Service
├── push.queue        → Push Service
├── notification.status → Status tracking
└── failed.queue      → Dead Letter Queue (DLQ)
```

## 🛡️ Key Features

| Feature | Purpose |
|---------|---------|
| **Circuit Breaker** | Prevents cascading failures when services go down |
| **Retry System** | Exponential backoff (max 3 attempts) for failed messages |
| **Idempotency** | Redis-based duplicate prevention using unique request IDs |
| **Dead Letter Queue** | Permanently failed messages move to DLQ |
| **Health Checks** | `/health` endpoints for monitoring and orchestration |
| **Service Discovery** | Services find each other dynamically |

## 📡 Request/Response Format

All endpoints follow this format:

```json
{
  "success": boolean,
  "message": string,
  "data": any,
  "meta": {
    "total": number,
    "limit": number,
    "page": number,
    "total_pages": number,
    "has_next": boolean,
    "has_previous": boolean
  }
}
```

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.9+ (for FastAPI services)

### Quick Start

1. **Clone and navigate:**
```bash
cd hng13-stage4-notification-system
```

2. **Start all services:**
```bash
docker-compose up -d
```

3. **Check service status:**
```bash
curl http://localhost:8000/health      # API Gateway
curl http://localhost:8004/health      # User Service
curl http://localhost:8002/health      # Email Service
curl http://localhost:8003/health      # Push Service
curl http://localhost:8001/health      # Template Service
```

## 📨 Sample Request

### Send Email Notification
```bash
curl -X POST http://localhost:8000/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "user-123",
    "template_code": "welcome",
    "variables": {
      "name": "John",
      "link": "https://example.com"
    },
    "request_id": "req-123",
    "priority": 1
  }'
```

### Send Push Notification
```bash
curl -X POST http://localhost:8000/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "push",
    "user_id": "user-123",
    "device_tokens": ["fcm_token_here"],
    "title": "Hello!",
    "body": "You have a new message",
    "priority": "high"
  }'
```

## 💾 Data Storage

- **PostgreSQL**: User data, preferences, templates, notification history
- **Redis**: Caching, idempotency, rate limiting

## 📊 Performance Targets

- Handle 1,000+ notifications per minute
- API Gateway response under 100ms
- 99.5% delivery success rate
- Horizontal scaling support

## 🔄 Notification Flow

1. Request arrives at API Gateway
2. Gateway publishes to appropriate queue (email/push)
3. Service consumes from queue
4. Notification is processed (retries on failure)
5. Status update sent to `notification.status` queue
6. Failed messages move to DLQ after max retries

## 🧪 Testing

Each service includes:
- Unit tests
- E2E tests
- Health check endpoints

Run tests:
```bash
# In each service directory
npm test          # NestJS services
pytest tests/     # FastAPI services
```

## 📋 Naming Conventions

All APIs use `snake_case` for fields:
- `notification_id`
- `device_tokens`
- `push_token`
- `notification_type`

## 🔐 Security Features

- Request validation & authentication
- Credential isolation per service
- Redis idempotency prevents duplicate charges
- Circuit breaker prevents DDoS-like cascades

## 📚 Documentation

- [API Gateway README](./api-gateway/README.md)
- [Push Service README](./push-service/README.md)
- [Email Service README](./email-service/README.md)
- [User Service README](./user-service/README.md)
- [Template Service README](./template-service/README.md)

## 📞 Support

For issues or questions, refer to individual service READMEs or check logs:

```bash
docker-compose logs -f push-service
docker-compose logs -f email-service
```

## 📄 License

MIT

---

**Built with NestJS, FastAPI, RabbitMQ, and Redis**
