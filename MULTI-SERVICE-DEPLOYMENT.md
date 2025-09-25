# 🚀 Multi-Service Deployment Guide

This guide covers deploying the WhatsApp bot as **two separate services** for optimal performance and scalability.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin         │    │   WhatsApp       │    │   Supabase      │
│   Dashboard     │◄──►│   Bot Service    │◄──►│   Database      │
│   (Port 3002)   │    │   (Port 3000)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎯 Two Services Needed

### Service 1: WhatsApp Bot 🤖
- **Purpose:** Main WhatsApp bot functionality
- **Port:** 3000
- **Container:** `Dockerfile.bot`
- **Endpoints:**
  - `/api/status` - Health check
  - WhatsApp message handling
  - Template loading from database

### Service 2: Admin Dashboard 🎨
- **Purpose:** Template management interface
- **Port:** 3002
- **Container:** `admin-dashboard/Dockerfile`
- **Features:**
  - Template editing
  - Live preview
  - Analytics dashboard

## 🐳 Coolify Deployment (Recommended)

### Option 1: Two Separate Applications

Create **two applications** in Coolify:

#### 1️⃣ WhatsApp Bot Service

**Repository:** `https://github.com/harshaislive/be_bot_whatsapp`

**Settings:**
```
Build Command: npm run build
Start Command: npm run start:prod
Dockerfile: Dockerfile.bot
Port: 3000
Health Check: /api/status
```

**Environment Variables:**
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
AZURE_OPENAI_API_KEY=your_openai_key
AZURE_OPENAI_ENDPOINT=your_endpoint
```

#### 2️⃣ Admin Dashboard Service

**Repository:** `https://github.com/harshaislive/be_bot_whatsapp`

**Settings:**
```
Build Command: cd admin-dashboard && npm run build
Start Command: cd admin-dashboard && npm start
Dockerfile: admin-dashboard/Dockerfile
Port: 3002
Health Check: /
```

**Environment Variables:**
```env
NODE_ENV=production
PORT=3002
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Option 2: Docker Compose (Single Stack)

Use the multi-service configuration:

**File:** `docker-compose.multi-service.yml`

Deploy with:
```yaml
# Use this file for Coolify stack deployment
version: '3.8'
services:
  whatsapp-bot:
    # Bot service configuration
  admin-dashboard:
    # Dashboard service configuration
```

## 🐋 Local Development

### Quick Start with Docker Compose

```bash
# Clone repository
git clone https://github.com/harshaislive/be_bot_whatsapp.git
cd be_bot_whatsapp

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Start both services
docker-compose -f docker-compose.multi-service.yml up -d
```

**Access Points:**
- WhatsApp Bot: http://localhost:3000
- Admin Dashboard: http://localhost:3002
- Bot Status: http://localhost:3000/api/status

### Individual Service Development

**WhatsApp Bot:**
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev
# or production mode
npm run start:prod
```

**Admin Dashboard:**
```bash
cd admin-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
# or build and start production
npm run build && npm start
```

## ⚙️ Configuration

### Required Environment Variables

#### WhatsApp Bot Service
```env
# Essential
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional
AZURE_OPENAI_API_KEY=your-key
REDIS_HOST=localhost
PORT=3000
NODE_ENV=production
```

#### Admin Dashboard Service
```env
# Essential
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional
PORT=3002
NODE_ENV=production
```

## 🔍 Health Checks & Monitoring

### Endpoints

**WhatsApp Bot:**
- `GET /api/status` - Service health
- `GET /api/health` - Detailed health check
- `GET /api/templates` - Template service status

**Admin Dashboard:**
- `GET /` - Dashboard accessibility
- `GET /api/health` - Next.js health

### Monitoring Commands

```bash
# Docker Compose logs
docker-compose -f docker-compose.multi-service.yml logs -f

# Individual service logs
docker-compose logs -f whatsapp-bot
docker-compose logs -f admin-dashboard

# Service status
curl http://localhost:3000/api/status
curl http://localhost:3002/
```

## 🚀 Production Optimizations

### Resource Allocation

**WhatsApp Bot Service:**
- CPU: 0.5-1 core
- Memory: 512MB-1GB
- Storage: Persistent volume for sessions

**Admin Dashboard:**
- CPU: 0.25-0.5 core
- Memory: 256MB-512MB
- Storage: Minimal (stateless)

### Scaling

**Bot Service:**
- Single instance (WhatsApp sessions are stateful)
- Use Redis for session management
- Persistent storage for wa_session directory

**Dashboard Service:**
- Can scale horizontally
- Stateless design
- Database connections pooled

## 🛡️ Security Considerations

### Network Security
```yaml
# Internal communication only
networks:
  internal:
    internal: true

services:
  whatsapp-bot:
    networks:
      - internal
    ports:
      - "3000:3000"  # Only if external access needed

  admin-dashboard:
    networks:
      - internal
    ports:
      - "3002:3002"  # Admin access
```

### Environment Variables
- Use Coolify's secret management
- Never expose in docker-compose files
- Separate production/staging configurations

## 🔧 Troubleshooting

### Common Issues

1. **Services Can't Communicate:**
   ```bash
   # Check network connectivity
   docker-compose exec whatsapp-bot ping admin-dashboard
   ```

2. **Database Connection Issues:**
   ```bash
   # Test Supabase connectivity
   curl "https://your-project.supabase.co/rest/v1/message_templates" \
     -H "apikey: your-anon-key"
   ```

3. **WhatsApp Session Problems:**
   ```bash
   # Check session persistence
   docker-compose exec whatsapp-bot ls -la /app/wa_session
   ```

### Logs Analysis

```bash
# Combined logs with timestamps
docker-compose logs -f -t

# Filter specific service
docker-compose logs -f whatsapp-bot | grep ERROR

# Admin dashboard build logs
docker-compose logs admin-dashboard | grep "Build"
```

## 📊 Service Communication Flow

1. **Admin creates/edits template** → Supabase Database
2. **Bot service checks for updates** → Every 5 minutes
3. **User sends WhatsApp message** → Bot loads fresh template
4. **Dashboard shows analytics** → Real-time from database

## 🎯 Deployment Checklist

**Before Deployment:**
- [ ] Supabase database configured and accessible
- [ ] Environment variables set correctly
- [ ] Docker images build successfully
- [ ] Health checks respond correctly

**After Deployment:**
- [ ] Both services accessible on their ports
- [ ] WhatsApp bot responds to messages
- [ ] Admin dashboard loads templates
- [ ] Database integration working
- [ ] Monitoring configured

---

**Ready to deploy!** Choose your deployment method and follow the appropriate section above. Both services will work together seamlessly to provide a complete WhatsApp bot management solution.