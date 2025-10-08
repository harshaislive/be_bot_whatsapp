# Beforest WhatsApp Bot - Complete User Flow Documentation

## 🎯 Bot Architecture Overview

### **Response Priority System**
1. **Static Routes (90%)** - Instant pattern matching
2. **AI Fallback (10%)** - Only for unrecognized natural language

### **LLM Activation Policy**
- ✅ **ONLY** when no static route matches
- ✅ Responses are **short and crisp** (1-2 sentences max)
- ✅ **Always** guides to menu when uncertain
- ✅ **Never** makes up information

---

## 📱 User Journey Flows

### **Initial Contact**

**Trigger:** User sends "hello", "hi", "hey", "start", or any greeting

**Bot Response:**
```
Hello! Welcome to Beforest 🌿

*How can we help you today?*

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Us

Type a number or "menu" anytime.
```

**Processing:** Static route - Instant response

---

## 🌲 Flow 1: Collective Visit

### **Entry Points:**
- User types: `1`
- User types: `collective`, `group visit`, `team outing`

### **Flow Steps:**

#### **Step 1: Request Details**
**Bot:**
```
*Collective Visit*

Please share these details in one message:

• Your name
• Email
• Purpose of visit
• Number of people
• Preferred date/time
• Special requirements (if any)
```

**Processing:** Static route - No LLM

---

#### **Step 2: User Provides Information**
**Example User Input:**
```
Sravani R
sravani@example.com
Team building
25 people
15th November 2025
Vegetarian meals preferred
```

**Bot Response:**
```
Thank you! We've received your details.

Our team will review your request and get back to you within 24 hours.

Need immediate assistance?
📧 crm@beforest.co
📞 +91 7680070541 (Mon-Fri, 10am-6pm)
```

**Processing:** Static route - No LLM
**Backend:** Logs to Supabase `bot_conversations` and `bot_messages`

---

## 🌿 Flow 2: Beforest Experiences

### **Entry Points:**
- User types: `2`
- User types: `experience`, `forest experience`, `nature`

### **Flow:**

**Bot Response:**
```
*Beforest Experiences*

Immersive nature journeys that leave you with joy and a sense of belonging.

Explore upcoming experiences:
https://experiences.beforest.co/
```

**Processing:** Static route - No LLM
**Session State:** `currentFlow: 'experiences'`

---

## 🍯 Flow 3: Bewild Produce

### **Entry Points:**
- User types: `3`
- User types: `bewild`, `products`, `honey`

### **Flow:**

**Bot Response:**
```
*Bewild Produce*

Good food from good practices — where forests and agriculture flourish together.

Discover more:
https://bewild.life/
```

**Processing:** Static route - No LLM
**Session State:** `currentFlow: 'bewild_produce'`

---

## 🏡 Flow 4: Beforest Hospitality

### **Entry Points:**
- User types: `4`
- User types: `accommodation`, `stay`, `booking`

### **Flow Steps:**

#### **Step 1: Show Options**
**Bot:**
```
*Beforest Hospitality*

Choose your perfect stay:

1. *Blyton Bungalow, Poomaale Collective, Coorg*
   Heritage bungalow in coffee plantations

2. *Glamping, Hyderabad Collective*
   Luxury tents with modern amenities

Please select 1 or 2 to continue.
```

**Processing:** Static route - No LLM

---

#### **Step 2a: Blyton Bungalow** (User types `1`)

**Entry Points (Direct Keywords):**
- User types: `coorg`, `blyton`, `bungalow`

**Bot Response:**
```
*Blyton Bungalow, Poomaale Collective, Coorg*

Eco-friendly luxury meets coffee plantations.

Learn more and book:
https://hospitality.beforest.co/

For pricing & availability:
📧 crm@beforest.co
📞 +91 7680070541
```

**Processing:** Static route - Smart accommodation detection
**Session State:** `currentFlow: 'hospitality_direct'`

---

#### **Step 2b: Glamping** (User types `2`)

**Entry Points (Direct Keywords):**
- User types: `glamping`, `hyderabad tent`, `hyderabad camp`

**Bot Response:**
```
*Glamping, Hyderabad Collective*

Luxury tents amidst striking rockscapes.

Learn more and book:
https://docs.google.com/forms/d/e/1FAIpQLSfnJDGgi6eSbx-pVdPrZQvgkqlxFuPja4UGaYLLyRBmYzx_zg/viewform

For pricing & availability:
📧 crm@beforest.co
📞 +91 7680070541
```

**Processing:** Static route - Smart accommodation detection
**Session State:** `currentFlow: 'hospitality_direct'`

---

## 📞 Flow 5: Contact Us

### **Entry Points:**
- User types: `5`
- User types: `query`, `question`, `support`, `help`, `contact`

### **Flow:**

**Bot Response:**
```
*Contact Us*

📧 crm@beforest.co
📞 +91 7680070541

*Available:* Monday to Friday, 10am-6pm
```

**Processing:** Static route - No LLM
**Session State:** `currentFlow: 'contact_team'`

---

## 🤖 LLM Fallback Scenarios

### **When LLM Activates:**
Only when user input doesn't match ANY static route:
- Greetings
- Menu keywords
- Numbered options (1-5)
- Service keywords
- Acknowledgments
- Flow-specific contexts

### **Example LLM Scenarios:**

#### **Scenario 1: Pricing Question**
**User:** "How much does glamping cost?"

**LLM Response:**
```
For pricing and availability, please contact us at crm@beforest.co or call +91 7680070541.

*What else can we help with?*

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Us
```

**LLM Behavior:**
- ✅ Admits uncertainty
- ✅ Redirects to contact (option 5)
- ✅ Shows menu
- ✅ Short response (1 sentence)

---

#### **Scenario 2: General Question**
**User:** "What makes Beforest different?"

**LLM Response:**
```
We focus on authentic nature experiences and sustainable living through restored forest landscapes.

*What else can we help with?*

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Us
```

**LLM Behavior:**
- ✅ Answers with known information
- ✅ Keeps it brief (1 sentence)
- ✅ Shows menu for next action

---

#### **Scenario 3: No Information Available**
**User:** "Do you offer weekend packages?"

**LLM Response:**
```
I don't have specific package details. Please contact us at crm@beforest.co or call +91 7680070541.

*What else can we help with?*

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Us
```

**LLM Behavior:**
- ✅ Honest about limitations
- ✅ Redirects to human contact
- ✅ Shows menu

---

## 🔄 Common User Actions

### **Action: Return to Menu**
**User types:** `menu`, `help`, `options`, `0`, `main`, `back`

**Bot:** Shows main menu
**Processing:** Static route - Instant

---

### **Action: Acknowledgment**
**User types:** `thanks`, `ok`, `thank you`, `great`

**Bot:** `Happy to help! Type "menu" for more options.`
**Processing:** Static route - Instant

---

### **Action: Escalation Request**
**User types:** `agent`, `human`, `representative`, `manager`

**Bot:**
```
Thank you!

*Connecting you to a human agent...*
*Current wait time: 2-3 minutes*

*Your conversation history has been shared*
*An agent will join this chat shortly*

*Stay in this chat - help is on the way!*
```

**Processing:** Static route - Instant
**Backend:** Marks session as escalated in Supabase

---

## 🚫 Message Filtering

### **What Bot IGNORES:**
- ❌ Group messages (`@g.us`)
- ❌ Broadcast messages (`@broadcast`)
- ❌ Status updates (`@status`)
- ❌ Non-text messages (images, videos, documents)
- ❌ Messages > 500 characters (spam prevention)
- ❌ Bot's own messages

### **What Bot RESPONDS TO:**
- ✅ Direct personal messages only (`@s.whatsapp.net`)
- ✅ Text messages only
- ✅ Messages < 500 characters

---

## 📊 Processing Flow Diagram

```
User Message
    ↓
Filter Check (group/broadcast/media)
    ↓ [Personal text message]
Immediate Typing Indicator
    ↓
Rate Limiting Check
    ↓
Static Route Matching (90% cases)
    ├── Greeting → Welcome
    ├── Menu → Show Options
    ├── 1-5 → Handle Service
    ├── Keywords → Direct to Service
    ├── Flow Context → Continue Flow
    └── No Match ↓
        ↓
    AI Fallback (10% cases)
        ├── Has Info → Answer + Menu
        └── No Info → Redirect to Contact + Menu
            ↓
    Log to Supabase
        ↓
    Send Response
```

---

## ⚡ Performance Characteristics

### **Response Times:**
- **Static Routes:** < 500ms (instant)
- **AI Fallback:** 1-3 seconds (shows "Just a moment...")
- **Database Logging:** Async (doesn't block user)

### **Typing Indicators:**
- **Immediate:** Sent before any processing
- **Duration:** 300-600ms based on message type
- **Natural:** Simulates human-like response time

---

## 💾 Data Storage

### **Supabase Tables:**
1. **bot_users** - User profiles and activity
2. **bot_conversations** - Conversation sessions
3. **bot_messages** - All messages (user + bot)
4. **bot_analytics** - Daily metrics
5. **bot_intents** - Intent recognition tracking

### **Redis Storage:**
- Session state and context
- Conversation history (last 5 messages)
- User profiles (cached)
- WhatsApp session data

---

## 🎨 Message Templates

### **Dynamic Templates (Supabase):**
Can be edited via Admin Dashboard:
- `welcome_message`
- `main_menu`
- `collective_visit_info`
- `experiences_message`
- `bewild_message`
- `hospitality_options`
- `contact_team_message`
- `error_fallback`

### **Fallback (Hardcoded):**
Used if database template not found or Supabase unavailable

---

## 🔐 Session Management

### **Session States:**
- `currentFlow`: Current conversation flow
- `menuLevel`: Depth in menu structure
- `supabaseConversationId`: Conversation tracking
- `parentOption`: For sub-menu navigation

### **Session Lifespan:**
- Persists in Redis
- Expires after inactivity
- Resets on "menu" command

---

## 🎯 LLM System Prompt Summary

**Identity:**
- "Beforest Member Support Team"
- Not a bot/AI (never announces as such)

**Response Style:**
- SHORT and crisp (1-2 sentences max)
- Warm and professional
- Use "we/our team" language

**When Uncertain:**
- Acknowledge: "I don't have that information readily available"
- Guide to menu OR contact team
- Never make up answers

**Redirect to Contact (option 5) for:**
- Pricing
- Availability
- Dates
- Product specifications
- Custom requests
- Anything outside core services

---

## 📈 Analytics Tracking

### **Tracked Events:**
- Message received/sent
- Service option selected
- AI fallback triggered
- Escalation requested
- Template used
- Intent recognized
- Response time

### **Metrics:**
- Total users
- Active users
- Conversations per day
- Messages per day
- Average response time
- Escalation rate
- Template performance

---

## 🔧 Error Handling

### **Graceful Degradation:**
1. **Supabase Down:** Use hardcoded templates
2. **Redis Down:** Continue without session (degraded)
3. **AI Error:** Show error fallback template
4. **Connection Lost:** Auto-reconnect (max 5 attempts)

### **Error Messages:**
All error messages guide back to menu or contact information

---

## Summary

**Static-First Architecture:**
- 90% of conversations handled without AI
- Instant responses via pattern matching
- AI only for truly unrecognized inputs

**User-Friendly:**
- Always shows menu after responses
- Never leaves user stuck
- Clear guidance at every step

**Professional:**
- Sounds human, not robotic
- Honest about limitations
- Efficient and concise

**Reliable:**
- Multiple fallback layers
- Comprehensive error handling
- Auto-recovery mechanisms
