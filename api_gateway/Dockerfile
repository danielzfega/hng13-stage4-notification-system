# Stage 1: Build & dev environment
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install global dev tools (Nest CLI, TS node)
RUN npm install -g @nestjs/cli typescript ts-node

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start NestJS in watch mode for hot reload
CMD ["npm", "run", "start:dev"]
