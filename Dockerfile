# ── Stage 1: Build frontend ──────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm vite build

# ── Stage 2: Production runtime ──────────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile && \
    apk del python3 make g++

# Copy source (backend runs via tsx directly)
COPY src/ ./src/
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY tailwind.config.js postcss.config.js ./

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist/

# SQLite database lives in /app/data (mounted volume)
RUN mkdir -p /app/data
ENV DB_PATH=/app/data/gxt-agent.db

EXPOSE 3377

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3377/api/health || exit 1

CMD ["pnpm", "start"]
