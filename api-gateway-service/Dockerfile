# Base image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build project
RUN npm run build

# Expose port
EXPOSE 8000

# Start the service
CMD ["npm", "run", "start:prod"]
