# Admin Dashboard Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build the Next.js app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Ensure public directory exists
RUN mkdir -p public

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install curl for health checks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3002

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Expose port
EXPOSE 3002

# Switch to nextjs user
USER nextjs

# Health check disabled - let Coolify handle it
# HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
#   CMD curl -f -s --max-time 10 http://localhost:3002 > /dev/null || exit 1

# Start the application on port 3002
CMD ["sh", "-c", "PORT=3002 exec node server.js"]