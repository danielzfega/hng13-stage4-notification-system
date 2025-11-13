#!/bin/bash

################################################################################
# Cloud Deployment Script for Distributed Notification System
# This script sets up and deploys the entire notification system on:
# - AWS EC2
# - Linode
# - DigitalOcean
# - Google Cloud Platform
# - Azure
# - Any Linux VPS/Server
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

################################################################################
# 1. System Update and Prerequisites
################################################################################
print_info "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

print_info "Installing required packages..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    jq \
    unzip

print_success "System packages updated and prerequisites installed"

################################################################################
# 2. Install Docker
################################################################################
if ! command_exists docker; then
    print_info "Installing Docker..."
    
    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_success "Docker installed successfully"
else
    print_success "Docker is already installed"
fi

################################################################################
# 3. Install Docker Compose (standalone)
################################################################################
if ! command_exists docker-compose; then
    print_info "Installing Docker Compose..."
    
    DOCKER_COMPOSE_VERSION="v2.24.0"
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose is already installed"
fi

################################################################################
# 4. Configure Environment Variables
################################################################################
print_info "Configuring environment variables..."

# Prompt for SMTP credentials
read -p "Enter SMTP Host (default: smtp.gmail.com): " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-smtp.gmail.com}

read -p "Enter SMTP Port (default: 587): " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-587}

read -p "Enter SMTP Username/Email: " SMTP_USER
read -sp "Enter SMTP Password: " SMTP_PASSWORD
echo ""

read -p "Enter SMTP Sender Email (default: same as username): " SMTP_SENDER
SMTP_SENDER=${SMTP_SENDER:-$SMTP_USER}

# Create/Update email service .env
cat > email-service/.env <<EOF
API_PORT=8002
RABBIT_URL=amqp://guest:guest@rabbitmq:5672
EXCHANGE=notifications.direct
ROUTING_KEY=email
EMAIL_QUEUE=email.queue
FAILED_QUEUE=failed.queue
REDIS_HOST=redis
REDIS_PORT=6379
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USERNAME=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=${SMTP_SENDER}
SMTP_SENDER=${SMTP_SENDER}
TEMPLATE_SERVICE_URL=http://template-service:8001
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60
MAX_RETRIES=3
RETRY_DELAY=5
EOF

print_success "Email service environment configured"

################################################################################
# 5. Set up Firebase (Optional for Push Notifications)
################################################################################
print_warning "Firebase Configuration for Push Notifications"
read -p "Do you have a Firebase service account JSON file? (y/n): " HAS_FIREBASE

if [[ "$HAS_FIREBASE" == "y" || "$HAS_FIREBASE" == "Y" ]]; then
    read -p "Enter the path to your firebase-service-account.json file: " FIREBASE_PATH
    
    if [ -f "$FIREBASE_PATH" ]; then
        cp "$FIREBASE_PATH" push-service/firebase-service-account.json
        print_success "Firebase service account configured"
    else
        print_error "File not found: $FIREBASE_PATH"
        print_warning "Push notifications will not work without valid Firebase credentials"
    fi
else
    print_warning "Skipping Firebase configuration. Push notifications will not work."
    print_info "You can add firebase-service-account.json to push-service/ folder later"
fi

################################################################################
# 6. Build and Start Services
################################################################################
print_info "Building and starting Docker services..."

# Make sure we're using the new docker group (requires re-login, so use sudo if needed)
if groups | grep -q docker; then
    docker-compose down -v 2>/dev/null || true
    docker-compose up -d --build
else
    sudo docker-compose down -v 2>/dev/null || true
    sudo docker-compose up -d --build
fi

print_success "Docker services started"

################################################################################
# 7. Wait for Services to be Ready
################################################################################
print_info "Waiting for services to be ready..."

wait_for_service() {
    local service_name=$1
    local health_endpoint=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Checking $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$health_endpoint" > /dev/null 2>&1; then
            print_success "$service_name is ready"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start"
    return 1
}

# Wait for services
wait_for_service "API Gateway" "http://localhost:8000/api/v1/health"
wait_for_service "User Service" "http://localhost:8004/health"
wait_for_service "Email Service" "http://localhost:8002/health"
wait_for_service "Template Service" "http://localhost:8001/api/v1/health"
wait_for_service "Push Service" "http://localhost:8003/health"

################################################################################
# 8. Run Tests
################################################################################
print_info "Running system tests..."

# Test user creation
print_info "Creating test user..."
USER_RESPONSE=$(curl -s -X POST http://localhost:8004/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user.'$(date +%s)'@example.com",
    "password": "Test@1234",
    "name": "EC2 Test User",
    "push_token": "test-fcm-token-ec2",
    "preferences": {
      "email_notifications": true,
      "push_notifications": true
    }
  }')

USER_ID=$(echo $USER_RESPONSE | jq -r '.data.user.id // .user.id')

if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
    print_error "Failed to create test user"
    echo "Response: $USER_RESPONSE"
else
    print_success "Test user created with ID: $USER_ID"
    
    # Test email notification
    print_info "Testing email notification..."
    EMAIL_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/notifications \
      -H "Content-Type: application/json" \
      -d '{
        "request_id": "req-ec2-test-email-'$(date +%s)'",
        "user_id": "'$USER_ID'",
        "notification_type": "email",
        "template_code": "welcome_email",
        "variables": {
          "name": "EC2 Test User",
          "link": "https://example.com/welcome"
        }
      }')
    
    EMAIL_NOTIF_ID=$(echo $EMAIL_RESPONSE | jq -r '.data.notification_id')
    if [ -z "$EMAIL_NOTIF_ID" ] || [ "$EMAIL_NOTIF_ID" == "null" ]; then
        print_warning "Email notification test failed"
        echo "Response: $EMAIL_RESPONSE"
    else
        print_success "Email notification queued: $EMAIL_NOTIF_ID"
    fi
    
    # Test push notification
    print_info "Testing push notification..."
    PUSH_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/notifications \
      -H "Content-Type: application/json" \
      -d '{
        "request_id": "req-ec2-test-push-'$(date +%s)'",
        "user_id": "'$USER_ID'",
        "notification_type": "push",
        "template_code": "welcome_email",
        "variables": {
          "name": "EC2 Test User",
          "link": "https://example.com/app"
        }
      }')
    
    PUSH_NOTIF_ID=$(echo $PUSH_RESPONSE | jq -r '.data.notification_id')
    if [ -z "$PUSH_NOTIF_ID" ] || [ "$PUSH_NOTIF_ID" == "null" ]; then
        print_warning "Push notification test failed"
        echo "Response: $PUSH_RESPONSE"
    else
        print_success "Push notification queued: $PUSH_NOTIF_ID"
    fi
fi

################################################################################
# 9. Display Service Status and URLs
################################################################################

# Get public IP (try multiple methods for different cloud providers)
PUBLIC_IP=""

# Method 1: Linode metadata service
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s --connect-timeout 2 -H "Metadata-Token-Expiry-Seconds: 30" http://169.254.169.254/v1/network 2>/dev/null | grep -oP '"ipv4":\s*{\s*"public":\s*\[\s*"\K[^"]+' || echo "")
fi

# Method 2: AWS EC2 metadata service
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
fi

# Method 3: DigitalOcean metadata service
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null || echo "")
fi

# Method 4: External service (ipify.org)
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s --connect-timeout 2 https://api.ipify.org 2>/dev/null || echo "")
fi

# Method 5: Another external service (ifconfig.me)
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s --connect-timeout 2 https://ifconfig.me 2>/dev/null || echo "")
fi

# Method 6: Check network interfaces (works for most Linux systems)
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(ip -4 addr show scope global | grep inet | head -1 | awk '{print $2}' | cut -d/ -f1 2>/dev/null || echo "")
fi

# If still no public IP, use localhost
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP="localhost"
    print_warning "Could not determine public IP. Using localhost for URLs."
else
    print_info "Detected public IP: ${PUBLIC_IP}"
fi

print_success "Deployment Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Notification System Deployed Successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Service Endpoints:"
echo "  • API Gateway:        http://${PUBLIC_IP}:8000"
echo "  • API Documentation:  http://${PUBLIC_IP}:8000/api-docs"
echo "  • User Service:       http://localhost:8004"
echo "  • Email Service:      http://localhost:8002"
echo "  • Template Service:   http://localhost:8001"
echo "  • Push Service:       http://localhost:8003"
echo "  • RabbitMQ Admin:     http://${PUBLIC_IP}:15672 (guest/guest)"
echo ""
echo "🔍 Useful Commands:"
echo "  • View all logs:           docker-compose logs -f"
echo "  • View specific service:   docker-compose logs -f <service-name>"
echo "  • Restart services:        docker-compose restart"
echo "  • Stop services:           docker-compose down"
echo "  • Check service status:    docker-compose ps"
echo ""
echo "🧪 Quick Test:"
echo "  curl -X POST http://localhost:8000/api/v1/notifications \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"request_id\":\"test-'$(date +%s)'\",\"user_id\":\"'$USER_ID'\",\"notification_type\":\"email\",\"template_code\":\"welcome_email\",\"variables\":{\"name\":\"Test\",\"link\":\"https://example.com\"}}'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Save deployment info
cat > deployment-info.txt <<EOF
Deployment Date: $(date)
Public IP: ${PUBLIC_IP}
Test User ID: $USER_ID

Service URLs:
- API Gateway: http://${PUBLIC_IP}:8000
- API Docs: http://${PUBLIC_IP}:8000/api-docs
- RabbitMQ: http://${PUBLIC_IP}:15672

Credentials:
- RabbitMQ: guest/guest
- SMTP User: $SMTP_USER

Note: If running locally (not on EC2), replace ${PUBLIC_IP} with your actual IP address.
EOF

print_success "Deployment information saved to deployment-info.txt"
