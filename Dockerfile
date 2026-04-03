# syntax=docker/dockerfile:1.4

# ── Stage 1: Build frontend ──────────────────────────────────────
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-builder
RUN apk add --no-cache python3 make g++
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Install backend production deps ─────────────────────
FROM --platform=$BUILDPLATFORM node:20-alpine AS backend-builder
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# ── Stage 3: Runtime ─────────────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache git tini su-exec

RUN addgroup -S giwicd && adduser -S -G giwicd giwicd

WORKDIR /app

COPY --from=backend-builder /build/backend/node_modules ./node_modules
COPY --from=frontend-builder /build/frontend/dist/frontend/browser/ ./frontend/dist/
COPY backend/src ./src
COPY backend/package.json ./
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
