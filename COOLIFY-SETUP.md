# 🚀 Coolify Deployment Guide

This guide shows you exactly how to deploy the multi-service WhatsApp bot in Coolify.

## 📋 **Quick Setup Summary**

You have **3 deployment options** in Coolify:

1. **Stack Deployment** - Single stack with both services ⭐ **RECOMMENDED**
2. **Separate Applications** - Two individual apps
3. **Single Application** - Combined deployment

---

## 🎯 **Option 1: Stack Deployment (Recommended)**

### **Step 1: Create New Stack**

1. **In Coolify Dashboard:** Click "New Resource" → "Stack"
2. **Name:** `whatsapp-bot-stack`
3. **Description:** `WhatsApp Bot with Admin Dashboard`

### **Step 2: Configure Stack**

**Repository Settings:**
```
Repository: https://github.com/harshaislive/be_bot_whatsapp
Branch: master
Docker Compose File: docker-compose.yml
```

**Or use specific file:**
```
Docker Compose File: coolify-stack.yml
```

### **Step 3: Environment Variables**

Set these **stack-level environment variables**:

```env
# Essential Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional AI Integration
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=your_model_deployment_name
```

### **Step 4: Deploy**

1. Click **"Deploy Stack"**
2. Wait for build to complete
3. Both services will be available:
   - **Bot API:** `https://your-stack-domain.coolify.app:3000`
   - **Admin Dashboard:** `https://your-stack-domain.coolify.app:3002`

---

## 🔧 **Option 2: Separate Applications**

### **App 1: WhatsApp Bot Service**

**Create Application:**
```
Type: Git Repository
Repository: https://github.com/harshaislive/be_bot_whatsapp
Branch: master
```

**Build Settings:**
```
Build Command: npm run build
Start Command: npm run start:prod
Dockerfile: Dockerfile.bot
Port: 3000
Health Check URL: /api/status
```

**Environment Variables:**
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=your_endpoint
```

### **App 2: Admin Dashboard**

**Create Application:**
```
Type: Git Repository
Repository: https://github.com/harshaislive/be_bot_whatsapp
Branch: master
```

**Build Settings:**
```
Build Context: admin-dashboard
Build Command: npm run build
Start Command: npm start
Dockerfile: admin-dashboard/Dockerfile
Port: 3002
Health Check URL: /
```

**Environment Variables:**
```env
NODE_ENV=production
PORT=3002
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🎨 **Option 3: Single Application (Fallback)**

If you want everything in one container:

**Create Application:**
```
Repository: https://github.com/harshaislive/be_bot_whatsapp
Dockerfile: Dockerfile (the original one)
Port: 3000
Build Command: npm run build
Start Command: npm start
```

**Note:** This runs only the bot. Dashboard needs to be deployed separately.

---

## 🔍 **Verification Steps**

After deployment, verify both services:

### **1. Check Bot Service**
```bash
curl https://your-bot-url.coolify.app/api/status
```
**Expected Response:**
```json
{
  "status": "healthy",
  "service": "whatsapp-bot",
  "uptime": "...",
  "templates": "loaded"
}
```

### **2. Check Admin Dashboard**
```bash
curl https://your-admin-url.coolify.app
```
**Expected:** HTML page loads successfully

### **3. Test Integration**
1. Open admin dashboard in browser
2. Verify templates load from database
3. Make a template edit
4. Confirm bot uses updated template

---

## 🛠️ **Troubleshooting**

### **Common Issues:**

**1. Build fails with missing build.js:**
- ✅ **Fixed!** The file is now in the repository

**2. Services can't connect to Supabase:**
```bash
# Test connection
curl "https://your-project.supabase.co/rest/v1/message_templates" \
  -H "apikey: your-anon-key"
```

**3. Admin dashboard shows blank page:**
- Check environment variables are prefixed with `NEXT_PUBLIC_`
- Verify Supabase URL and key are correct

**4. WhatsApp bot doesn't respond:**
- Check `/api/status` endpoint
- Verify template service is loading from database
- Check container logs

### **Viewing Logs:**

In Coolify:
1. Go to your Stack/Application
2. Click "Logs" tab
3. Select service (whatsapp-bot or admin-dashboard)
4. View real-time logs

---

## 📊 **Service URLs**

After deployment, you'll have:

**Stack Deployment:**
- Main Stack URL: `https://your-stack.coolify.app`
- Bot Service: `https://your-stack.coolify.app:3000`
- Admin Dashboard: `https://your-stack.coolify.app:3002`

**Separate Apps:**
- Bot: `https://whatsapp-bot.coolify.app`
- Admin: `https://admin-dashboard.coolify.app`

---

## 🎯 **Production Checklist**

Before going live:

- [ ] Supabase database configured with templates
- [ ] Environment variables set correctly
- [ ] Both services respond to health checks
- [ ] Admin dashboard loads templates
- [ ] Bot processes test messages
- [ ] SSL certificates configured
- [ ] Monitoring and alerting set up

---

## 🚀 **Ready to Deploy!**

Choose **Option 1 (Stack Deployment)** for the easiest setup. The `docker-compose.yml` file in your repository will automatically configure both services.

Your WhatsApp bot and admin dashboard will be fully operational with dynamic template management! 🎉