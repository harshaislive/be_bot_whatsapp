# 🚀 Deployment Guide - Enterprise WhatsApp Bot

This guide covers deploying the WhatsApp bot to various platforms including Coolify, Docker, and cloud providers.

## 📋 Prerequisites

### Required Environment Variables

Set these in your deployment platform:

```env
# Essential - Supabase Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - AI Integration
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=your_model_deployment_name

# Optional - Redis (uses memory if not provided)
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional - Server Configuration
PORT=3000
NODE_ENV=production
```

## 🐳 Coolify Deployment

### Method 1: Direct Git Deployment

1. **In Coolify Dashboard:**
   - Create new application
   - Select "Git Repository"
   - Connect to: `https://github.com/harshaislive/be_bot_whatsapp.git`
   - Set branch: `master`

2. **Build Configuration:**
   ```
   Build Command: npm run build
   Start Command: npm run start:prod
   Port: 3000
   ```

3. **Environment Variables:**
   Add all required environment variables in Coolify's environment section.

4. **Deploy:**
   - Coolify will automatically build and deploy
   - Health check available at `/api/status`

### Method 2: Docker Build

If the automatic build fails, you can use Docker:

```bash
# In your repository root
docker build -t whatsapp-bot .
docker run -p 3000:3000 --env-file .env whatsapp-bot
```

## 🐋 Docker Deployment

### Local Docker Compose

1. **Clone repository:**
   ```bash
   git clone https://github.com/harshaislive/be_bot_whatsapp.git
   cd be_bot_whatsapp
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f whatsapp-bot
   ```

### Production Docker

```bash
# Build production image
docker build -t whatsapp-bot .

# Run with environment variables
docker run -d \
  --name whatsapp-bot \
  --restart unless-stopped \
  -p 3000:3000 \
  -e SUPABASE_URL="your_url" \
  -e SUPABASE_ANON_KEY="your_key" \
  -v $(pwd)/wa_session:/app/wa_session \
  -v $(pwd)/logs:/app/logs \
  whatsapp-bot
```

## ☁️ Cloud Platform Deployment

### Vercel (For Admin Dashboard Only)

The admin dashboard can be deployed separately on Vercel:

```bash
cd admin-dashboard
npm run build
vercel --prod
```

### Railway

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Build Command: `npm run build`
4. Start Command: `npm run start:prod`

## 🔧 Troubleshooting Deployment Issues

### Common Issues and Solutions

1. **Build fails with missing `build.js`:**
   - Ensure `build.js` exists in project root
   - Run: `git pull origin master` to get latest changes

2. **Admin dashboard build fails:**
   - The bot will still work without the dashboard
   - Build continues with warning

3. **Environment variables not recognized:**
   ```bash
   # Test locally first
   npm run build
   npm run start:prod
   ```

4. **WhatsApp session issues:**
   - Ensure `/wa_session` directory is persistent
   - Use volumes in Docker deployments

5. **Database connection fails:**
   ```bash
   # Test Supabase connection
   curl "https://your-project.supabase.co/rest/v1/message_templates" \
     -H "apikey: your-anon-key"
   ```

### Health Checks

The application provides health check endpoints:

- **Bot Status:** `GET /api/status`
- **Database:** `GET /api/health/database`
- **Template Service:** `GET /api/health/templates`

### Monitoring

Check application logs:

```bash
# Docker Compose
docker-compose logs -f whatsapp-bot

# Docker
docker logs -f whatsapp-bot

# Local
npm run logs
```

## 🚀 Production Optimizations

### Performance

1. **Redis for Sessions:**
   ```env
   REDIS_HOST=your_redis_host
   REDIS_PORT=6379
   ```

2. **Database Connection Pooling:**
   Supabase handles this automatically.

3. **Environment Specific Settings:**
   ```env
   NODE_ENV=production
   LOG_LEVEL=warn
   ```

### Security

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform-specific secret management

2. **Network Security:**
   - Use HTTPS in production
   - Restrict database access by IP if possible

3. **Session Security:**
   - Use persistent volumes for WhatsApp sessions
   - Regular backups of session data

## 📊 Monitoring & Maintenance

### Analytics

The bot provides built-in analytics accessible at:
- Admin Dashboard: `/admin` (when available)
- API Endpoints: `/api/analytics/*`

### Logs

Application logs include:
- Message processing
- Template loading
- Error handling
- Performance metrics

### Updates

To update the deployed application:

1. **Git-based deployments (Coolify/Railway):**
   ```bash
   git push origin master
   ```

2. **Docker deployments:**
   ```bash
   git pull origin master
   docker-compose down
   docker-compose up -d --build
   ```

## 🆘 Support

If you encounter deployment issues:

1. **Check logs:** Look for specific error messages
2. **Verify environment:** Ensure all required variables are set
3. **Test locally:** Confirm the application works locally
4. **Database access:** Verify Supabase connectivity
5. **Resources:** Ensure adequate CPU/memory allocation

## 📝 Deployment Checklist

- [ ] Repository cloned and up to date
- [ ] Environment variables configured
- [ ] Database tables created in Supabase
- [ ] Build process completes successfully
- [ ] Health check endpoint responds
- [ ] WhatsApp session persistence configured
- [ ] Monitoring and logging enabled
- [ ] Backup strategy in place

---

**Need help?** Check the main [README.md](README.md) or create an issue in the repository.