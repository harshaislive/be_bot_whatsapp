# 🚀 Coolify Setup Guide - Quick Start

## Current Status

✅ **Repository updated** - Simplified LLM bot is now default
✅ **Missing function fixed** - `formatAIResponseWithMenu` error resolved
⏳ **Coolify needs redeploy** - Pull latest changes and redeploy

## What Changed

Your previous deployment was running `app-enterprise.js` (complex bot) which had a bug.

**Now deploying:** `app-simple-llm.js` (simplified LLM bot)
- 100% AI-driven
- Natural conversations
- Comprehensive knowledge base

## Coolify Configuration

### 1. Build Settings

```yaml
General:
  Repository: https://github.com/harshaislive/be_bot_whatsapp.git
  Branch: master

Build:
  Dockerfile: Dockerfile.bot
  Build Command: (leave default)
  Start Command: npm run start:prod

Network:
  Port: 3000
```

### 2. Environment Variables (REQUIRED)

```env
AZURE_OPENAI_API_KEY=your_actual_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
NODE_ENV=production
```

**Optional (but recommended):**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
REDIS_URL=redis://your_redis_url
LOG_LEVEL=info
```

### 3. Persistent Storage

**Important:** Add volume mount to preserve WhatsApp session

```yaml
Volume Mounts:
  - Source: (auto-generated)
    Destination: /app/wa_session

  - Source: (auto-generated)
    Destination: /app/logs
```

This prevents re-scanning QR code on every deployment.

## Deployment Steps

### First Time Setup

1. **In Coolify Dashboard:**
   - Create New Resource → Application
   - Source: Git Repository
   - Repository: `https://github.com/harshaislive/be_bot_whatsapp.git`
   - Branch: `master`

2. **Configure Build:**
   - Build Type: Dockerfile
   - Dockerfile Location: `Dockerfile.bot`
   - Build Command: (leave empty)
   - Start Command: `npm run start:prod`

3. **Set Environment Variables:**
   - Add all required variables (see above)
   - Azure OpenAI credentials are REQUIRED

4. **Add Persistent Storage:**
   - Click "Storages"
   - Add volume: `/app/wa_session`
   - Add volume: `/app/logs` (optional)

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

6. **First Run - Get QR Code:**
   - Go to "Logs" tab
   - Look for QR code in ASCII art
   - Scan with WhatsApp (Link Device)
   - Session will be saved in persistent volume

### Redeploying (After Code Updates)

```bash
# Coolify will auto-deploy if webhook is set up
# Or manually trigger:
```

1. Go to your application in Coolify
2. Click "Deploy" button
3. Watch logs for:
   ```
   ✅ Simplified LLM Bot started
   ✅ WhatsApp connected successfully
   ```

**No QR code needed** - session restored from `/app/wa_session`

## Verifying Correct Bot is Running

### ✅ Simplified Bot (Correct)

**Logs show:**
```
✅ Simplified LLM Bot started
📩 Message from 91xxx: Hello
🤖 AI Fallback triggered for natural language input
✅ AI response sent to 91xxx
```

**Behavior:**
- Responds naturally to any question
- Uses knowledge base intelligently
- No numbered menu (unless specifically asked)

### ❌ Complex Bot (Old - Should Not See This)

**Logs show:**
```
🤖 Enterprise WhatsApp Bot initialized
📋 Static routing patterns loaded
🎯 Bot Configuration:
```

**Behavior:**
- Shows numbered menu options
- Pattern matching responses
- Structured flows

**If you see this:** Coolify is still using old code. Force redeploy.

## Testing After Deployment

Send these messages to your WhatsApp bot:

### Test 1: General Question
```
You: "Tell me about your stays"

Expected: Natural response about Blyton Bungalow and Glamping with details
```

### Test 2: Specific Property
```
You: "What can I do at Blyton?"

Expected: List of activities - coffee tours, nature walks, traditional meals
```

### Test 3: Property Switching
```
You: "Tell me about Blyton"
(gets response)
You: "What about glamping?"

Expected: Smoothly switches to Glamping details
```

### Test 4: Pricing (Should Redirect)
```
You: "How much does it cost?"

Expected: "For pricing and availability, please contact crm@beforest.co or call +91 7680070541"
```

### Test 5: Products
```
You: "What products do you sell?"

Expected: List of Bewild products with shop link
```

## Troubleshooting

### Issue: Still getting old bot behavior

**Solution:**
```bash
# In Coolify:
1. Go to Settings → General
2. Check "Force rebuild"
3. Click Deploy
4. Check logs for "Simplified LLM Bot started"
```

### Issue: "formatAIResponseWithMenu is not a function"

**Solution:**
- This is fixed in latest code
- Pull latest: Settings → General → Deploy (latest)
- Or in Git: Force Pull Latest

### Issue: QR code keeps appearing

**Solution:**
- Persistent volume not configured
- Add storage mount: `/app/wa_session`
- Redeploy

### Issue: "AZURE_OPENAI_API_KEY is missing"

**Solution:**
- Environment variables not set
- Go to Settings → Environment Variables
- Add all required Azure OpenAI credentials
- Redeploy

### Issue: High costs / too many tokens

**Solution:**
- Simplified bot uses AI for EVERY message
- This is expected (500-1000 tokens per conversation)
- To reduce costs, switch to Complex bot:
  ```
  Start Command: node src/app-enterprise.js
  ```

## Monitoring

### Check Token Usage (Azure Portal)

1. Go to Azure OpenAI resource
2. Click "Metrics"
3. Monitor "Total Tokens"

**Expected for Simplified Bot:**
- Every message = 1 AI call
- ~500-1000 tokens per conversation
- Higher than complex bot (which uses AI for only ~10%)

### Check Logs

**Important log patterns:**

✅ **Good - Bot working:**
```
✅ Simplified LLM Bot started
📩 Message from 91xxx
🧠 Generating AI response
✅ AI response sent
```

⚠️ **Warning - Environment issue:**
```
❌ AZURE_OPENAI_API_KEY missing
⚠️ Azure OpenAI NOT CONFIGURED
```

❌ **Error - Needs attention:**
```
❌ AI fallback error: TypeError
❌ Error processing message
```

## Quick Command Reference

```bash
# Check which bot will run
cat package.json | grep "main"
# Should show: "main": "src/app-simple-llm.js"

# Check start command
cat package.json | grep "start:prod"
# Should show: "start:prod": "NODE_ENV=production node src/app-simple-llm.js"

# Force pull latest code (in Coolify)
Settings → General → Deploy Latest
```

## Next Steps

1. ✅ Redeploy in Coolify with latest code
2. ✅ Verify logs show "Simplified LLM Bot started"
3. ✅ Test with sample messages
4. ✅ Monitor token usage in Azure
5. ✅ If costs are high, consider switching to Complex bot

## Support

**If simplified bot doesn't meet your needs:**

Switch to complex bot (lower costs, menu-driven):
```yaml
Start Command: node src/app-enterprise.js
```

Both bots are production-ready - choose based on:
- **Simplified:** Better UX, natural conversation, higher costs
- **Complex:** Lower costs, faster responses, menu-driven

---

**All set?** Deploy and test! 🚀
