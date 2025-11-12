# Base image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source code (including prisma/schema.prisma)
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build project
RUN npm run build

# Expose port
EXPOSE 8000

# Start the service
CMD ["npm", "run", "start:prod"]
