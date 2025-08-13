# Multi-stage build for React client
FROM node:18-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production

COPY client/ ./
RUN npm run build

# Multi-stage build for NestJS server
FROM node:18-alpine AS server-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
COPY --from=client-builder /app/client/dist ./dist/client
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application
COPY --from=server-builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=server-builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=server-builder --chown=nestjs:nodejs /app/package*.json ./

USER nestjs

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["dumb-init", "node", "dist/main"]
