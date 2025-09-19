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
# Copy data folder for imports in components
COPY data/ ../data/
ENV DOCKER_BUILD=true
RUN npm run build

# Multi-stage build for NestJS server
FROM node:20-alpine AS server-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy source files more explicitly to ensure structure is preserved
COPY src/ ./src/
# Explicitly copy api-logging directory to ensure it's available
COPY src/api-logging/ ./src/api-logging/
COPY data/ ./data/
COPY nest-cli.json ./
COPY tsconfig*.json ./
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

# Install dumb-init for proper signal handling and Chromium for Puppeteer
RUN apk add --no-cache \
    dumb-init \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Give the user access to chromium
RUN chmod 755 /usr/bin/chromium-browser

# Copy built application
COPY --from=server-builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=server-builder --chown=nestjs:nodejs /app/client/dist ./client/dist
COPY --from=server-builder --chown=nestjs:nodejs /app/data ./data
COPY --from=server-builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=server-builder --chown=nestjs:nodejs /app/package*.json ./

# Create public directory and copy contents
RUN mkdir -p ./public/images/shows
# Create temp directory for image processing with proper permissions
RUN mkdir -p ./temp/images && chown -R nestjs:nodejs ./temp
# Copy client build files and public assets
COPY --from=server-builder --chown=nestjs:nodejs /app/public/ ./public/

USER nestjs

EXPOSE 8080

ENV NODE_ENV=production

CMD ["dumb-init", "node", "dist/main"]
