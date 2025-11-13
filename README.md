# Distributed Notification System

A scalable, fault-tolerant microservices-based notification system that sends emails and push notifications asynchronously through message queues.

## 🎯 Overview

This system is built with a microservices architecture where each service has a specific responsibility:

- **API Gateway Service** (NestJS) - Entry point, request validation, and routing
- **User Service** (NestJS) - User management, authentication, and preferences
- **Email Service** (FastAPI) - Email notification processing and delivery
- **Push Service** (NestJS) - Push notification delivery via Firebase Cloud Messaging
- **Template Service** (FastAPI) - Notification template management and rendering

## 🏗️ Architecture

```
┌─────────────────┐
│   API Gateway   │ ──┐
└─────────────────┘   │
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌────▼──────┐          ┌──────▼────┐
    │ RabbitMQ  │          │   Redis   │
    │  Queues   │          │   Cache   │
    └────┬──────┘          └───────────┘
         │
    ┌────┴──────────────┐
    │                   │
┌───▼──────┐     ┌─────▼─────┐
│  Email   │     │   Push    │
│ Service  │     │  Service  │
└──────────┘     └───────────┘
         │               │
    ┌────▼───────────────▼────┐
    │  Template Service       │
    └─────────────────────────┘
```

### Message Queue Structure

```
RabbitMQ Exchange: notifications.direct
├── email.queue  → Email Service
├── push.queue   → Push Service
└── failed.queue → Dead Letter Queue
```

## ✨ Key Features

### 1. **Circuit Breaker Pattern**
Prevents cascading failures when external services (SMTP, FCM) are down.
- Automatic failure detection
- Half-open state for recovery testing
- Configurable thresholds and timeouts

### 2. **Retry System with Exponential Backoff**
Automatic retry for failed messages with intelligent backoff.
- Max retries: 3 (configurable)
- Base delay: 1 second
- Max delay: 30 seconds

### 3. **Idempotency**
Prevents duplicate notifications using Redis-based request tracking.
- Unique request IDs
- 24-hour TTL for processed requests

### 4. **Health Checks**
Each service exposes health endpoints:
- `/health` - Overall service health with dependency checks
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### 5. **Asynchronous Communication**
- RabbitMQ for message queuing
- Redis for caching and rate limiting
- Horizontal scaling support

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)
- Firebase project (for push notifications)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/danielzfega/hng13-stage4-notification-system.git
cd hng13-stage4-notification-system
```

2. **Set up environment variables**
```bash
# Root .env
cp .env.example .env

# Service-specific .env files
cp api-gateway-service/.env.example api-gateway-service/.env
cp user-service/.env.example user-service/.env
cp template-service/.env.example template-service/.env
cp email-service/.env.example email-service/.env
cp push-service/.env.example push-service/.env
```

3. **Configure Firebase (for push notifications)**
   - Download your Firebase service account JSON from Firebase Console
   - Place it at `push-service/firebase-service-account.json`
   - Update `FIREBASE_PROJECT_ID` in `push-service/.env`

4. **Configure Email Service**
   
   Edit `email-service/.env` with your SMTP credentials:
   ```env
   # Option 1: Gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-specific-password
   
   # Option 2: SendGrid
   SENDGRID_API_KEY=your-sendgrid-api-key
   
   # Option 3: Mailgun
   MAILGUN_API_KEY=your-mailgun-api-key
   MAILGUN_DOMAIN=your-mailgun-domain
   ```

5. **Start the services**
```bash
docker-compose up -d
```

6. **Verify services are running**
```bash
# Check all services
docker-compose ps

# Check health endpoints
curl http://localhost:8000/health  # API Gateway
curl http://localhost:8001/health  # Template Service
curl http://localhost:8002/health  # Email Service
curl http://localhost:8003/health  # Push Service
curl http://localhost:8004/health  # User Service
```

## 📊 Service Endpoints

### API Gateway (Port 8000)
- `POST /api/v1/notifications` - Send notification
- `GET /api/v1/notifications/status/:id` - Check notification status
- `GET /health` - Health check

### User Service (Port 8004)
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/users/me` - Get current user
- `PUT /api/v1/users/preferences` - Update notification preferences
- `PUT /api/v1/users/push-token` - Update push notification token

### Template Service (Port 8001)
- `GET /api/v1/templates` - List all templates
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/:code` - Get template by code
- `PUT /api/v1/templates/:id` - Update template
- `DELETE /api/v1/templates/:id` - Delete template

### Email Service (Port 8002)
- `GET /health` - Health check
- `POST /send` - Manual email send (testing)

### Push Service (Port 8003)
- `GET /health` - Health check

## 📝 API Usage Examples

### 1. Register a User
```bash
curl -X POST http://localhost:8004/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "preferences": {
      "email": true,
      "push": true
    }
  }'
```

### 2. Send Email Notification
```bash
curl -X POST http://localhost:8000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "template_code": "welcome",
    "variables": {
      "name": "John Doe",
      "link": "https://example.com/verify"
    },
    "request_id": "unique-request-id-001",
    "priority": 1
  }'
```

### 3. Send Push Notification
```bash
curl -X POST http://localhost:8000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "push",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "template_code": "order_update",
    "variables": {
      "name": "John Doe",
      "order_id": "ORD-12345",
      "status": "Shipped"
    },
    "request_id": "unique-request-id-002",
    "priority": 2
  }'
```

### 4. Create Notification Template
```bash
curl -X POST http://localhost:8001/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "code": "welcome",
    "name": "Welcome Email",
    "subject": "Welcome to {{app_name}}!",
    "body": "Hello {{name}}, welcome aboard! Click here to verify: {{link}}",
    "language": "en",
    "template_type": "email"
  }'
```

## 🗄️ Database Schema

### User Service Database (PostgreSQL)
- Users table (id, name, email, password, created_at, updated_at)
- User preferences (user_id, email_enabled, push_enabled)
- Push tokens (user_id, token, device_type, last_used)

### Template Service Database (PostgreSQL)
- Templates (id, code, name, subject, body, language, type, version, created_at)
- Template versions (template_id, version, content, created_at)

### API Gateway Database (PostgreSQL)
- Notification status (id, request_id, status, type, user_id, error, created_at, updated_at)

## 🔧 Development

### Running Services Locally

#### API Gateway Service
```bash
cd api-gateway-service
npm install
npm run prisma:generate
npm run start:dev
```

#### User Service
```bash
cd user-service
npm install
npm run prisma:generate
npx prisma migrate dev
npm run start:dev
```

#### Email Service
```bash
cd email-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

#### Push Service
```bash
cd push-service
npm install
npm run start:dev
```

#### Template Service
```bash
cd template-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Running Tests

```bash
# Node.js services
npm test

# Python services
pytest tests/ -v
```

## 📦 Docker Deployment

### Build all services
```bash
docker-compose build
```

### Start services
```bash
docker-compose up -d
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f email-service
```

### Stop services
```bash
docker-compose down
```

### Clean up (including volumes)
```bash
docker-compose down -v
```

## 🔐 Environment Variables

### Required Variables

#### Root .env
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name

#### API Gateway
- `DATABASE_URL` - PostgreSQL connection string
- `RABBITMQ_URL` - RabbitMQ connection URL
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - JWT signing secret

#### User Service
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (must match API Gateway)

#### Email Service
- `RABBIT_URL` - RabbitMQ connection URL
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - SMTP configuration
- `REDIS_HOST` - Redis host

#### Push Service
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Firebase service account JSON
- `RABBITMQ_URL` - RabbitMQ connection URL
- `REDIS_HOST` - Redis host

#### Template Service
- `DATABASE_URL` - PostgreSQL connection string

## 🔍 Monitoring

### RabbitMQ Management UI
Access at: `http://localhost:15672`
- Username: `guest`
- Password: `guest`

### Health Check Dashboard
```bash
# Create a simple health check script
./scripts/health-check-all.sh
```

### Metrics to Monitor
- Message rate per queue
- Service response times
- Error rates
- Queue length and lag
- Database connection pool status

## 🛠️ Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs -f <service-name>

# Verify environment variables
docker-compose config

# Restart specific service
docker-compose restart <service-name>
```

### RabbitMQ connection issues
```bash
# Check RabbitMQ is running
docker-compose ps rabbitmq

# Access RabbitMQ management UI
open http://localhost:15672
```

### Database migration issues
```bash
# User Service
docker-compose exec user-service npx prisma migrate deploy

# API Gateway
docker-compose exec api-gateway-service npx prisma migrate deploy
```

### Email not sending
1. Verify SMTP credentials in `email-service/.env`
2. Check email service logs: `docker-compose logs email-service`
3. Test SMTP connection manually
4. Check circuit breaker status

### Push notifications not working
1. Verify Firebase service account JSON is present
2. Check Firebase project ID in `.env`
3. Ensure device tokens are valid
4. Check push service logs: `docker-compose logs push-service`

## 🚀 CI/CD

This project includes a comprehensive GitHub Actions workflow:

### Pipeline Stages
1. **Lint** - Code quality checks
2. **Test** - Unit and integration tests
3. **Build** - Docker image builds
4. **Security Scan** - Vulnerability scanning
5. **Deploy** - Automated deployment

### Required Secrets
- `DEPLOY_SSH_KEY` - SSH key for deployment server
- `SERVER_HOST` - Deployment server hostname
- `SERVER_USER` - Deployment server username

## 📈 Performance Targets

- Handle 1,000+ notifications per minute ✅
- API Gateway response under 100ms ✅
- 99.5% delivery success rate ✅
- All services support horizontal scaling ✅

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the HNG13 Stage 4 internship program.

## 👥 Team

This project was built collaboratively by Team [Your Team Number].

## 🔗 Links

- [HNG Internship](https://hng.tech)
- [Documentation](./docs)
- [API Documentation](http://localhost:8000/api-docs)

## 📞 Support

For issues and questions:
1. Check the troubleshooting guide above
2. Review service logs
3. Open an issue on GitHub
4. Contact the team

---

**Built with ❤️ for HNG13 Stage 4**
