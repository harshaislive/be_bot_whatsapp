# 🚀 Deployment Guide

> **🎯 ACTIVE BOT: Complex Flow-Based** (`src/app-enterprise.js`)
>
> This guide covers deploying to Coolify, Docker, and cloud platforms.

## 🤖 Which Bot is Deployed?

**Currently Active:** Complex Flow-Based Bot (Enterprise)
- File: `src/app-enterprise.js`
- 90% static pattern matching, 10% AI fallback
- Lower token costs, faster responses
- Menu-driven with structured flows

**Alternative:** Simplified LLM-First Bot
- File: `src/app-simple-llm.js`
- 100% AI-driven conversations
- See "Switching Between Bots" section below

## 📋 Prerequisites

### Required Environment Variables

**For Complex Flow-Based Bot (Current):**

```env
# REQUIRED - Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# RECOMMENDED - Supabase (for template management & logging)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OPTIONAL - Redis (for session management)
REDIS_URL=redis://localhost:6379

# OPTIONAL - Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
```

**For Simplified LLM Bot:**
- Same as above
- Supabase optional (for logging only)
- Azure OpenAI is critical (used for every message)

## 🐳 Coolify Deployment (Recommended)

### Recommended Configuration

**Use `Dockerfile.bot` for bot-only deployment (smaller, faster):**

1. **In Coolify Dashboard:**
   - Create new application
   - Select "Git Repository"
   - Connect to: `https://github.com/harshaislive/be_bot_whatsapp.git`
   - Set branch: `master`

2. **Build Configuration:**
   ```
   Dockerfile: Dockerfile.bot
   Build Command: (leave default)
   Start Command: npm run start:prod
   Port: 3000
   ```

3. **Environment Variables:**
   Add required variables (see Prerequisites section above)
   - Azure OpenAI credentials (REQUIRED)
   - Supabase (optional)
   - Redis (optional)

4. **Persistent Storage (Important):**
   ```
   Volume Mount: /app/wa_session
   ```
   This preserves WhatsApp session between deployments

5. **Deploy:**
   - Click Deploy
   - Check logs for QR code (first time only)
   - Scan QR with WhatsApp to authenticate

### Alternative: Full Stack Deployment

Use `Dockerfile` if you need admin dashboard:

```yaml
Dockerfile: Dockerfile
Start Command: npm start
```

Note: Larger build, includes Next.js dashboard

### Verifying Deployment

**Check logs for:**
```
🤖 Enterprise WhatsApp Bot initialized
📋 Static routing patterns loaded
✅ WhatsApp connected successfully
```

**NOT:**
```
✅ Simplified LLM Bot started  # This is the simple LLM bot
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

## 🔄 Switching Between Bots

### Currently Active: Complex Flow-Based Bot (Enterprise)

To switch to Simplified LLM Bot:

**Method 1: Update package.json (Permanent)**
```json
{
  "main": "src/app-simple-llm.js",
  "scripts": {
    "start:prod": "NODE_ENV=production node src/app-simple-llm.js"
  }
}
```
Then redeploy.

**Method 2: Override Start Command in Coolify (Quick)**
```
Start Command: node src/app-simple-llm.js
```
Redeploy - no code changes needed.

**Method 3: Update scripts/start.js**
Change line 146:
```javascript
const child = spawn('node', ['src/app-simple-llm.js'], {
```

### Comparison

| Feature | Complex (Active) | Simplified |
|---------|------------------|------------|
| **Code** | 1000+ lines | 200 lines |
| **AI Usage** | ~10% of messages | Every message |
| **Cost** | Lower tokens | Higher tokens |
| **Response** | Menu-driven | Natural conversation |
| **Speed** | Instant (pattern match) | 1-2s (AI call) |
| **Maintenance** | Complex (templates, flows) | Easy (1 knowledge base) |

## 📝 Deployment Checklist

- [ ] Repository cloned and up to date (`git pull origin master`)
- [ ] Environment variables configured (Azure OpenAI REQUIRED)
- [ ] Correct Dockerfile selected (`Dockerfile.bot` recommended)
- [ ] Verified which bot is active (check package.json main field)
- [ ] Persistent volume for /app/wa_session configured
- [ ] Build process completes successfully
- [ ] Check deployment logs for correct bot startup message
- [ ] Scan QR code and authenticate WhatsApp (first time)
- [ ] Test bot with sample messages
- [ ] Monitor token usage and costs (especially for simplified bot)

## 🐛 Troubleshooting

### "formatAIResponseWithMenu is not a function"
- **Fixed in:** commit `4b4c6ca`
- **Solution:** Pull latest code and redeploy

### Wrong bot is running
1. Check `package.json` → `main` field
2. Check `scripts/start.js` → line 146
3. Check Coolify start command override
4. Look at startup logs for bot identifier

### High token costs
- Complex bot uses AI for ~10% of messages (natural language fallback)
- Simplified bot uses AI for every message (500-1000 tokens each)
- Currently using Complex bot = lower costs

### QR Code not appearing
- Check container logs in Coolify
- QR code prints to stdout on first run
- Session persists in /app/wa_session after first scan

---

**Need help?**
- Check [SIMPLE_LLM_APPROACH.md](SIMPLE_LLM_APPROACH.md) for bot architecture
- Check main [README.md](README.md) for project overview
- Create an issue in the repository