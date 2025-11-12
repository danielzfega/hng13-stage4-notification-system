# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Run
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy only built files and node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

# Expose the port your NestJS app runs on
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]
