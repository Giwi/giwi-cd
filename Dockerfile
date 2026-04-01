# syntax=docker/dockerfile:1.4

FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Build frontend
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm ci && npm run build

# Build backend
WORKDIR /app
COPY backend/package*.json backend/
WORKDIR /app/backend
RUN npm ci --only=production

COPY backend/src ./src
COPY backend/.env.example ./.env

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/frontend/dist/frontend/browser ./frontend/dist
COPY --from=builder /app/backend ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/index.js"]
