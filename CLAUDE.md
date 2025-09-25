# Claude Code Assistant Instructions

This file contains specific instructions for Claude Code to better understand and work with this project.

## Project Overview
This is an enterprise-grade WhatsApp bot built with BuilderBot framework and Azure OpenAI integration. The bot is designed to provide top-tier customer experience comparable to big brands.

## Architecture
- **Framework**: BuilderBot (Node.js/TypeScript)
- **AI Provider**: Azure OpenAI (GPT-5 Chat)
- **Database**: MongoDB
- **Language**: JavaScript (ES modules)

## Key Components

### Core Files
- `src/app.js` - Main application entry point
- `src/config/config.js` - Configuration management
- `src/ai/openai.js` - Azure OpenAI integration

### Flows
- `src/bot/flows/welcomeFlow.js` - Welcome and greeting flow
- `src/bot/flows/aiFlow.js` - AI conversation handling
- `src/bot/flows/menuFlow.js` - Menu navigation and options
- `src/bot/flows/escalationFlow.js` - Human agent escalation

### Utilities
- `src/utils/logger.js` - Logging system
- `src/utils/sessionManager.js` - Session state management
- `src/utils/userProfileManager.js` - User profiling and personalization
- `src/utils/errorHandler.js` - Error handling and recovery

### Middleware
- `src/middleware/rateLimiter.js` - Rate limiting and abuse prevention
- `src/middleware/analytics.js` - Analytics and metrics tracking

## Development Commands

### Setup and Start
```bash
npm run setup    # Interactive setup wizard
npm start        # Production start with checks
npm run dev      # Development mode with auto-restart
```

### Maintenance
```bash
npm run lint     # Code quality check
npm test         # Run tests
npm run logs     # View application logs
npm run status   # Check bot status
```

## Configuration
- Environment variables in `.env` file
- Main configuration in `src/config/config.js`
- See `.env.example` for required variables

## Key Features to Remember
1. **AI Integration**: Uses Azure OpenAI with contextual conversation
2. **User Profiling**: Personalized responses based on user history
3. **Session Management**: Stateful conversations with history
4. **Rate Limiting**: Intelligent request throttling
5. **Error Handling**: Graceful fallbacks and escalation
6. **Analytics**: Comprehensive tracking and metrics
7. **Escalation System**: Seamless handoff to human agents

## Common Tasks

### Adding New Flows
1. Create flow file in `src/bot/flows/`
2. Export from `src/bot/flows/index.js`
3. Add to main flow in `src/app.js`

### Modifying AI Behavior
- Edit system prompts in `src/ai/openai.js`
- Adjust context handling in conversation flows
- Update user profiling logic in `src/utils/userProfileManager.js`

### Adding Analytics
- Use `analyticsManager.trackMessage()` or similar methods
- Add custom metrics in `src/middleware/analytics.js`

### Error Handling
- Use `errorHandler.handleError()` for consistent error handling
- Add custom error types in `src/utils/errorHandler.js`

## Testing and Debugging
- Check logs in `logs/app.log`
- Use `npm run logs` to tail logs in real-time
- Monitor analytics for performance insights
- Test with different user scenarios

## Dependencies
Key dependencies to be aware of:
- `@builderbot/bot` - Core bot framework
- `@builderbot/provider-baileys` - WhatsApp provider
- `@builderbot/database-mongo` - MongoDB integration
- `openai` - Azure OpenAI client
- `winston` - Logging
- `rate-limiter-flexible` - Rate limiting

## Best Practices
1. Always use async/await for AI calls
2. Handle errors gracefully with user-friendly messages
3. Track important metrics with analytics
4. Use session state for conversation context
5. Implement rate limiting for AI-heavy operations
6. Log important events for debugging
7. Follow the established error handling patterns

## Environment Requirements
- Node.js 18+
- MongoDB database
- Azure OpenAI API access
- WhatsApp Business account for production

This is a production-ready enterprise bot with comprehensive features for customer support and engagement.