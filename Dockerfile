# Multi-stage build for Enterprise WhatsApp Bot
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build admin dashboard
FROM base AS dashboard-builder
WORKDIR /app
COPY admin-dashboard/package*.json ./admin-dashboard/
RUN cd admin-dashboard && npm ci

COPY admin-dashboard ./admin-dashboard
RUN cd admin-dashboard && npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built application
COPY --from=deps /app/node_modules ./node_modules
COPY --from=dashboard-builder --chown=nextjs:nodejs /app/admin-dashboard/.next ./admin-dashboard/.next
COPY --from=dashboard-builder /app/admin-dashboard/public ./admin-dashboard/public

# Copy source code
COPY --chown=nextjs:nodejs . .

# Create necessary directories
RUN mkdir -p logs wa_session && chown -R nextjs:nodejs logs wa_session

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "
    const http = require('http');
    const options = { hostname: 'localhost', port: 3000, path: '/api/status', timeout: 5000 };
    const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1));
    req.on('error', () => process.exit(1));
    req.on('timeout', () => process.exit(1));
    req.end();
  " || exit 1

# Start the application
CMD ["npm", "start"]