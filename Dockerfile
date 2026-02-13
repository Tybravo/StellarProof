# Base image
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache git

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json ./

# Copy source code
COPY . .

# Install dependencies
RUN pnpm install

# Expose ports
# Frontend
EXPOSE 3000
# Oracle Worker (default port)
EXPOSE 8080

# Default command
CMD ["pnpm", "dev"]
