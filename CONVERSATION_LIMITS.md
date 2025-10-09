# 🔄 Conversation & Parallel User Limits

## Parallel Conversations

### ✅ Unlimited Parallel Users

Both bots can handle **unlimited parallel conversations** - there's no hard limit on the number of users chatting simultaneously.

**How it works:**
- Each user identified by their WhatsApp phone number
- Separate conversation history stored per user
- No interference between different users' conversations

**Example:**
```
User A (91XXX1111) → "Tell me about Blyton"
User B (91XXX2222) → "What products?"
User C (91XXX3333) → "I want a collective visit"

All processed simultaneously, each maintains their own context
```

## Conversation History Limits

### Complex Bot (Enterprise)

**Per-User History:**
- Stored in Redis (if configured) or memory
- Last **5 messages** used for AI context
- Full history logged to Supabase (unlimited, for analytics)

**Location:** `src/utils/sessionManager.js`
```javascript
getConversationHistory(userPhone, limit = 5)
```

### Simplified LLM Bot

**Per-User History:**
- Stored in memory (Map)
- Keeps last **10 messages** per user
- Automatically cleans up old messages

**Location:** `src/app-simple-llm.js`
```javascript
// Keep only last 10 messages
if (history.length > 10) {
    history.shift();
}

// Uses last 5 for AI context
getHistory(userPhone, limit = 5)
```

## Memory & Performance

### Memory Usage Per User

**Complex Bot:**
- ~1-2 KB per user (session data)
- ~5-10 KB per user (last 5 messages)
- Redis persistence (optional)

**Simplified Bot:**
- ~10-20 KB per user (last 10 messages in memory)
- No database dependency for sessions

### Scalability

**Expected Capacity:**

| Server Spec | Concurrent Users | Notes |
|-------------|------------------|-------|
| **1 CPU, 512MB RAM** | 50-100 users | Memory constrained |
| **1 CPU, 1GB RAM** | 200-500 users | Comfortable for small business |
| **2 CPU, 2GB RAM** | 1000-2000 users | Medium business |
| **4 CPU, 4GB RAM** | 5000-10000 users | Large scale |

**Bottlenecks:**
1. **Azure OpenAI API limits** (tokens per minute)
2. **WhatsApp rate limits** (messages per second)
3. **Server memory** (conversation history storage)

Not the bot code itself - it can handle many parallel users.

## Session Timeout

### Inactivity Timeout

**Complex Bot:**
```javascript
// Sessions expire after 24 hours of inactivity
// Configurable in sessionManager
```

**Simplified Bot:**
```javascript
// No automatic timeout
// Conversation history stays in memory until:
// 1. Server restarts
// 2. User reaches 10 message limit (oldest deleted)
```

### Cleanup

**When users stop chatting:**
- Complex: Session persists in Redis/memory for 24h
- Simplified: History stays in memory (10 messages max)
- Both: No active cleanup needed (memory is minimal)

## Testing Parallel Conversations

### Test Scenario

```bash
# Simulate 3 parallel users
User 1: "Hello" → Bot responds
User 2: "What stays?" → Bot responds
User 1: "Tell me about Blyton" → Bot remembers context from "Hello"
User 3: "Collective visit" → Bot responds
User 2: "Glamping details" → Bot remembers context from "What stays?"
```

Each user's context is maintained separately.

## Real-World Usage

### Small Business (< 100 daily users)
- **Server:** 1 CPU, 1GB RAM
- **Peak concurrent:** ~10-20 users
- **Works perfectly** with both bot types

### Medium Business (100-500 daily users)
- **Server:** 2 CPU, 2GB RAM
- **Peak concurrent:** ~50-100 users
- **Recommended:** Complex bot (lower token costs)
- **Add Redis** for session persistence

### Large Scale (500+ daily users)
- **Server:** 4 CPU, 4GB RAM+
- **Peak concurrent:** 200+ users
- **Required:** Redis for sessions
- **Monitor:** Azure OpenAI token limits
- **Consider:** Load balancer for multiple instances

## Monitoring Parallel Users

### Check Active Users

**In logs, look for:**
```
📩 Message from 91xxx
✅ Response sent to 91xxx
```

Count unique phone numbers in last 5 minutes = concurrent users.

### Performance Metrics

**Watch for:**
1. **Response time** (should be < 3 seconds)
2. **Memory usage** (should not exceed 70% of available)
3. **Token usage** (Azure OpenAI dashboard)
4. **Error rates** (in logs)

### Redis Benefits (Optional)

**Why use Redis:**
- Session persistence across server restarts
- Better performance with 100+ concurrent users
- Share sessions across multiple bot instances (load balancing)

**Setup:**
```env
REDIS_URL=redis://your-redis-host:6379
```

Bot automatically uses Redis if configured, falls back to memory if not.

## Limits Summary

| Aspect | Complex Bot | Simplified Bot |
|--------|-------------|----------------|
| **Parallel users** | Unlimited | Unlimited |
| **History per user** | 5 messages (AI context) | 10 messages (stored) |
| **Context used** | Last 5 messages | Last 5 messages |
| **Storage** | Redis or memory | Memory only |
| **Session timeout** | 24h inactivity | No timeout |
| **Memory per user** | ~5-10 KB | ~10-20 KB |
| **Database logs** | Full history (Supabase) | Optional |

## Increasing Limits

### To Handle More Users

1. **Add more RAM** (most important)
2. **Add Redis** (for persistence & sharing)
3. **Reduce history limit** (currently 5-10 messages)
4. **Add load balancer** (multiple bot instances)

### To Store More History

Complex bot already logs everything to Supabase:
```javascript
// Full conversation logged to database
await supabaseService.logConversation(...)
```

Access full history in Supabase `conversations` table.

## Best Practices

✅ **Do:**
- Monitor memory usage
- Use Redis for > 100 concurrent users
- Set up Supabase for full history logging
- Monitor Azure OpenAI token limits

❌ **Don't:**
- Worry about user limits (bot handles many users)
- Store excessive history in memory (5-10 messages is enough for context)
- Run without monitoring on high traffic

## Questions?

**Q: Can 100 people chat at once?**
A: Yes! Bot handles unlimited parallel conversations.

**Q: Will users see each other's messages?**
A: No. Each user has completely separate conversation context.

**Q: How much history is kept?**
A: Last 5-10 messages for AI context. Full history logged to Supabase (optional).

**Q: What happens when server restarts?**
A:
- With Redis: Sessions persist
- Without Redis: In-memory history lost, but Supabase logs remain
- Users can continue chatting immediately (new session created)

**Q: Can I increase history limit?**
A: Yes, change `limit = 5` in code, but more history = more tokens per API call = higher costs.

---

**TL;DR:** Bot handles unlimited parallel users. Each user gets their own conversation context. No hard limits on concurrent conversations!
