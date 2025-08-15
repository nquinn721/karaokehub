# Multi-stage build for React client
FROM node:20-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

COPY client/src ./src
COPY client/index.html ./
COPY client/vite.config.ts ./
COPY client/tsconfig*.json ./
# Ensure public directory exists
RUN mkdir -p ./public
# Copy public files if they exist
COPY client/public/ ./public/
ENV DOCKER_BUILD=true
RUN npm run build

# Multi-stage build for NestJS server
FROM node:20-alpine AS server-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
COPY --from=client-builder /app/client/dist ./client/dist

# Ensure public directory exists and copy client assets
RUN mkdir -p ./public/images/shows
# Copy additional public assets from client public directory first (images, etc.)
COPY --from=client-builder /app/client/public/ ./public/
# Copy client build output (index.html, assets, etc.) to public directory - this should come last to override
COPY --from=client-builder /app/client/dist/ ./public/

RUN npm run build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install dependencies needed for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application
COPY --from=server-builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=server-builder --chown=nestjs:nodejs /app/client/dist ./client/dist
COPY --from=server-builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=server-builder --chown=nestjs:nodejs /app/package*.json ./

# Create public directory and copy contents
RUN mkdir -p ./public/images/shows
# Copy client build files and public assets
COPY --from=server-builder --chown=nestjs:nodejs /app/public/ ./public/

USER nestjs

EXPOSE 8080

ENV NODE_ENV=production

CMD ["dumb-init", "node", "dist/main"]
