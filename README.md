# 🤖 Beforest WhatsApp Bot - Enterprise Edition

A sophisticated WhatsApp bot built with BuilderBot framework, featuring AI integration, dynamic message templates, and a professional admin dashboard for content management.

## 🌟 Features

### Core Bot Features
- **Static-First Routing**: 90% faster responses with instant pattern matching
- **AI Fallback**: Azure OpenAI integration for natural language processing
- **Dynamic Templates**: Database-driven message content management
- **User Profiling**: Personalized responses based on user history
- **Session Management**: Stateful conversations with Redis persistence
- **Rate Limiting**: Intelligent request throttling and abuse prevention
- **Analytics**: Comprehensive tracking and metrics
- **Escalation System**: Seamless handoff to human agents
- **Error Handling**: Graceful fallbacks and recovery mechanisms

### Admin Dashboard
- **Template Management**: Real-time editing of bot messages
- **Live Preview**: See how messages appear to users
- **Variable Support**: Dynamic content with `{{name}}`, `{{collective}}` etc.
- **Category Organization**: Organized message templates
- **Usage Analytics**: Track template performance
- **Professional UI**: Built with Next.js 14 and shadcn/ui

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Enterprise     │    │   Admin         │
│   Users         │◄──►│   Bot            │◄──►│   Dashboard     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Supabase       │    │   Template      │
                       │   Database       │◄──►│   Service       │
                       └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Redis          │
                       │   Session Store  │
                       └──────────────────┘
```

## 📁 Project Structure

```
├── src/
│   ├── app-enterprise.js       # Main bot application (ENTRY POINT)
│   ├── ai/
│   │   └── openai.js          # Azure OpenAI integration
│   ├── api/
│   │   ├── routes.js          # Express API routes
│   │   └── whatsappControl.js # WhatsApp control endpoints
│   ├── config/
│   │   └── config.js          # Environment configuration
│   ├── middleware/
│   │   ├── analytics.js       # Analytics tracking
│   │   └── rateLimiter.js     # Rate limiting
│   ├── services/
│   │   ├── redisService.js    # Redis connection
│   │   ├── supabaseService.js # Supabase database
│   │   └── templateService.js # Message templates
│   └── utils/
│       ├── errorHandler.js    # Error handling
│       ├── logger.js          # Logging utility
│       ├── redisSessionManager.js
│       ├── sessionManager.js  # Session management
│       └── userProfileManager.js
├── scripts/
│   └── start.js               # Startup validation script
├── admin-dashboard/           # Next.js admin interface
├── logs/                      # Application logs
├── wa_session/                # WhatsApp session data
└── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Redis server (for session management)
- Supabase account (for database)
- Azure OpenAI API access
- WhatsApp account (personal or business)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/harshaislive/be_bot_whatsapp.git
   cd be_bot_whatsapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd admin-dashboard && npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Azure OpenAI
   AZURE_OPENAI_API_KEY=your_api_key
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_DEPLOYMENT=your_deployment_name
   AZURE_OPENAI_API_VERSION=2024-02-15-preview

   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key

   # Redis (optional)
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Server
   PORT=3000
   NODE_ENV=development
   ```

4. **Set up database**
   - Run `bot_tables_setup.sql` in your Supabase SQL editor
   - Run `templates_setup.sql` for message templates

5. **Start the bot**
   ```bash
   npm start        # Production mode with validation
   # OR
   npm run dev      # Development mode with auto-reload
   ```

6. **Scan QR code**
   - QR code will appear in terminal
   - Or open `logs/whatsapp-qr.png` if terminal QR is unclear
   - Scan with WhatsApp → Settings → Linked Devices

7. **Start admin dashboard** (optional)
   ```bash
   cd admin-dashboard
   npm run dev
   # Visit http://localhost:3002
   ```

## ⚙️ Configuration

### Environment Variables

```env
# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./wa_session

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_DEPLOYMENT=your_deployment

# Supabase Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=production
```

### Database Schema

The bot uses Supabase with the following main tables:
- `message_templates` - Dynamic message content
- `message_categories` - Template organization
- `bot_conversations` - Chat history
- `bot_messages` - Message logging
- `bot_users` - User management

## 📱 Bot Features

### Dynamic Message Templates

All bot responses are now database-driven and editable via the admin dashboard:

| Template Key | Purpose | Variables |
|-------------|---------|-----------|
| `welcome_message` | Initial greeting | `{{name}}` |
| `main_menu` | Service options | - |
| `collective_visit_options` | Group bookings | - |
| `bewild_message` | Product info | - |
| `experiences_message` | Activity details | - |
| `general_query_message` | Support contact | - |
| `hospitality_options` | Accommodations | - |
| `error_fallback` | Error handling | - |

### Service Flows

1. **Collective Visits** - Group experience bookings
2. **Beforest Experiences** - Nature activities and tours
3. **Bewild Produce** - Sustainable product information
4. **Hospitality** - Accommodation options
5. **General Queries** - Support and contact

## 🔧 Admin Dashboard

Access at `http://localhost:3002` when running in development.

### Features
- **Template Editor**: Rich text editing with live preview
- **Variable Detection**: Automatic `{{variable}}` recognition
- **Category Management**: Organize templates by service
- **Analytics Dashboard**: Usage statistics and metrics
- **Search & Filter**: Find templates quickly
- **Real-time Updates**: Changes reflect in bot within 5 minutes

### Template Management Workflow

1. **Edit Template**: Make changes in the dashboard
2. **Preview**: See how it appears to users
3. **Save**: Changes stored in database
4. **Auto-Refresh**: Bot picks up changes within 5 minutes
5. **Fallback Safety**: Bot continues working if database unavailable

## 🛠️ Development Commands

```bash
# Bot Development
npm run dev          # Development mode with auto-restart
npm run logs         # View application logs
npm run status       # Check bot status
npm test             # Run tests
npm run lint         # Code quality check

# Admin Dashboard
cd admin-dashboard
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
```

## 📊 Analytics & Monitoring

The bot includes comprehensive analytics:
- Message volume and patterns
- User engagement metrics
- Template usage statistics
- Performance monitoring
- Error tracking and alerts

## 🔒 Security Features

- Rate limiting and abuse prevention
- Input validation and sanitization
- Secure session management
- Environment variable protection
- SQL injection prevention
- XSS protection in admin dashboard

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   PORT=3000
   ```

2. **Database Migration**
   - Run production database setup
   - Configure connection pools

3. **Process Management**
   ```bash
   pm2 start ecosystem.config.js
   ```

4. **Admin Dashboard**
   ```bash
   cd admin-dashboard
   npm run build
   pm2 start npm --name "admin-dashboard" -- start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 API Documentation

The bot exposes several API endpoints for integration:
- `/api/status` - Bot health check
- `/api/analytics` - Usage statistics
- `/api/messages` - Message history
- `/api/templates` - Template management

## 🐛 Troubleshooting

### Common Issues

1. **WhatsApp Connection Issues**
   - Check session files in `wa_session/`
   - Ensure QR code is scanned within timeout
   - Verify WhatsApp Web access

2. **Database Connection**
   - Verify Supabase credentials
   - Check RLS policies
   - Ensure tables exist

3. **Template Not Updating**
   - Wait 5 minutes for cache refresh
   - Check template key matches exactly
   - Verify template is marked as active

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [BuilderBot](https://builderbot.vercel.app/)
- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Database by [Supabase](https://supabase.com/)
- AI integration with [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service)

---

**🌿 Built for Beforest - Connecting people with authentic nature experiences**

For support, contact: [support@beforest.co](mailto:support@beforest.co)