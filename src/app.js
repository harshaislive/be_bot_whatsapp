import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot';
import pkg from '@builderbot/database-json';
const { JsonFileDB } = pkg;
import { BaileysProvider } from '@builderbot/provider-baileys';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { analyticsManager } from './middleware/analytics.js';
import { rateLimitManager } from './middleware/rateLimiter.js';
import { azureOpenAI } from './ai/openai.js';

// Import flows
import {
    welcomeFlow,
    aiFlow,
    menuFlow,
    productFlow,
    supportFlow,
    accountFlow,
    billingFlow,
    escalationFlow,
    urgentFlow,
    callbackFlow
} from './bot/flows/index.js';

// Create main flow that handles all unmatched messages
const mainFlow = addKeyword(EVENTS.WELCOME)
    .addAnswer('🚀 *Enterprise WhatsApp Bot Starting...*')
    .addAction(async (ctx, { gotoFlow }) => {
        // All new conversations start with welcome flow
        return gotoFlow(welcomeFlow);
    });

// Create fallback flow for unmatched messages (AI handling)
const fallbackFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
        try {
            const phone = ctx.from;
            const message = ctx.body;

            logger.userInteraction(phone, 'message_received', { message });

            // Check rate limits
            const rateLimitCheck = await rateLimitManager.middleware(ctx);
            if (!rateLimitCheck.allowed) {
                await flowDynamic(rateLimitCheck.error);
                return;
            }

            // Track analytics
            analyticsManager.trackMessage(phone, message, 'user');

            // Handle specific commands first
            const lowerMessage = message.toLowerCase().trim();

            // Check for menu/help commands
            if (['menu', 'help', 'options', '0'].includes(lowerMessage)) {
                return gotoFlow(menuFlow);
            }

            // Check for escalation keywords
            if (['agent', 'human', 'representative', 'manager', 'escalate', '5'].includes(lowerMessage)) {
                return gotoFlow(escalationFlow);
            }

            // Check for urgent keywords
            if (['urgent', 'emergency', 'critical', 'asap'].includes(lowerMessage)) {
                return gotoFlow(urgentFlow);
            }

            // Handle numbered options
            if (lowerMessage === '1') return gotoFlow(productFlow);
            if (lowerMessage === '2') return gotoFlow(supportFlow);
            if (lowerMessage === '3') return gotoFlow(accountFlow);
            if (lowerMessage === '4') return gotoFlow(billingFlow);

            // For everything else, use AI
            const startTime = Date.now();

            // Get current state and conversation history
            const currentState = await state.get();
            const conversationHistory = currentState.conversationHistory || [];
            const userProfile = {
                name: currentState.userName || ctx.pushName,
                phone: phone,
                preferences: currentState.preferences || {},
                language: currentState.language || 'en'
            };

            // Check if escalation is needed
            const needsEscalation = await azureOpenAI.checkForEscalation(message, conversationHistory);
            if (needsEscalation) {
                analyticsManager.trackEscalation(phone, 'ai_detected');
                return gotoFlow(escalationFlow);
            }

            // Generate AI response
            const aiResponse = await azureOpenAI.generateContextualResponse(
                message,
                conversationHistory,
                userProfile
            );

            // Update conversation history
            const updatedHistory = [
                ...conversationHistory,
                { role: 'user', content: message, timestamp: new Date() },
                { role: 'assistant', content: aiResponse.content, timestamp: new Date() }
            ].slice(-10); // Keep last 10 messages

            await state.update({
                conversationHistory: updatedHistory,
                lastInteraction: new Date(),
                currentContext: 'ai_conversation'
            });

            // Track response time and AI usage
            const responseTime = analyticsManager.trackResponseTime(phone, startTime);
            analyticsManager.trackMessage(phone, aiResponse.content, 'ai');

            logger.aiUsage('contextual_response', aiResponse.usage?.total_tokens || 0, {
                phone,
                responseTime,
                responseLength: aiResponse.content.length
            });

            // Send AI response
            await flowDynamic(aiResponse.content);

            // Occasionally show menu option
            if (Math.random() > 0.8) { // 20% chance
                await flowDynamic([
                    '',
                    '💡 *Tip: Type "menu" anytime for quick options*'
                ]);
            }

        } catch (error) {
            logger.error('Error in fallback flow:', error);
            analyticsManager.trackError(ctx.from, error, 'fallback_flow');

            await flowDynamic([
                '🛠️ I apologize for the technical difficulty.',
                'Let me connect you with a human agent.',
                '',
                'Type "agent" for immediate assistance.'
            ]);
        }
    });

// Create the main bot flow
const botFlow = createFlow([
    mainFlow,
    welcomeFlow,
    menuFlow,
    productFlow,
    supportFlow,
    accountFlow,
    billingFlow,
    escalationFlow,
    urgentFlow,
    callbackFlow,
    fallbackFlow
]);

async function startBot() {
    try {
        logger.info('Starting Enterprise WhatsApp Bot...', {
            nodeEnv: config.server.nodeEnv,
            port: config.server.port
        });

        // Initialize database (JSON file-based - no MongoDB required)
        const database = new JsonFileDB({
            filename: 'data/bot_database.json'
        });

        // Initialize WhatsApp provider
        const provider = createProvider(BaileysProvider, {
            name: config.bot.name
        });

        // Create the bot
        const bot = createBot({
            flow: botFlow,
            provider,
            database
        });

        // Set up global error handlers
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Shutting down bot gracefully...');

            // Export final metrics
            const finalMetrics = analyticsManager.exportMetrics();
            logger.info('Final metrics exported', finalMetrics);

            process.exit(0);
        });

        logger.info('🚀 Enterprise WhatsApp Bot started successfully!', {
            features: Object.keys(config.features).filter(key => config.features[key]),
            analyticsEnabled: config.analytics.enabled
        });

        // Log startup metrics
        setTimeout(() => {
            const metrics = analyticsManager.getGlobalMetrics();
            logger.info('Bot startup metrics', metrics);
        }, 5000);

    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Start the bot
startBot();