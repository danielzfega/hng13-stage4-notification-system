# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN pnpm exec prisma generate

# Copy source code
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src/

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy prisma schema for migrations
COPY prisma ./prisma/

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 8000

# Run migrations and start the service
CMD pnpm exec prisma migrate deploy && node dist/main.js
