import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot';
import pkg from '@builderbot/database-json';
const { JsonFileDB } = pkg;
import { BaileysProvider } from '@builderbot/provider-baileys';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { azureOpenAI } from './ai/openai.js';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';

// Simple welcome flow
const welcomeFlow = addKeyword(['hello', 'hi', 'hey', 'start', 'hola', 'oi'])
    .addAnswer('🎉 Welcome to our Enterprise Support Center!', null, async (ctx, { flowDynamic, state }) => {
        try {
            const userPhone = ctx.from;
            const userName = ctx.pushName || 'Valued Customer';

            logger.userInteraction(userPhone, 'welcome_flow_started', { userName });

            await state.update({
                userPhone,
                userName,
                conversationStart: new Date(),
                conversationHistory: []
            });

            await flowDynamic([
                `Hi ${userName}! 👋`,
                'I\'m your AI assistant ready to provide excellent service.',
                '',
                '📋 How can I assist you today?',
                '',
                '*Quick Options:*',
                '1️⃣ Product Information',
                '2️⃣ Technical Support',
                '3️⃣ Account Help',
                '4️⃣ Billing Questions',
                '5️⃣ Speak to Human Agent',
                '',
                'Just type the number or describe your need!'
            ]);

        } catch (error) {
            logger.error('Error in welcome flow:', error);
            await flowDynamic('Welcome! How can I help you today?');
        }
    });

// Menu flow
const menuFlow = addKeyword(['menu', '0', 'options'])
    .addAnswer('📋 *Main Menu*', null, async (ctx, { flowDynamic }) => {
        await flowDynamic([
            '*Quick Menu Options:*',
            '',
            '1️⃣ *Product Information*',
            '2️⃣ *Technical Support*',
            '3️⃣ *Account Management*',
            '4️⃣ *Billing & Payments*',
            '5️⃣ *Live Agent*',
            '',
            '📝 *Or simply describe what you need!*'
        ]);
    });

// Product info flow
const productFlow = addKeyword(['1', 'product', 'products'])
    .addAnswer('🛍️ *Product Information*', null, async (ctx, { flowDynamic }) => {
        await flowDynamic([
            'What would you like to know about our products?',
            '',
            '• Features & Specifications',
            '• Pricing & Plans',
            '• Availability',
            '• Comparisons',
            '',
            'Just ask me anything! 🚀'
        ]);
    });

// Support flow
const supportFlow = addKeyword(['2', 'support', 'technical', 'help'])
    .addAnswer('🔧 *Technical Support*', null, async (ctx, { flowDynamic }) => {
        await flowDynamic([
            'I\'m here to help with technical issues!',
            '',
            '• Setup & Installation',
            '• Troubleshooting',
            '• Performance Issues',
            '• Error Resolution',
            '',
            'Please describe your issue in detail. 🛠️'
        ]);
    });

// Account flow
const accountFlow = addKeyword(['3', 'account', 'profile'])
    .addAnswer('👤 *Account Management*', null, async (ctx, { flowDynamic }) => {
        await flowDynamic([
            'Account management at your service!',
            '',
            '• Profile Updates',
            '• Security Settings',
            '• Order History',
            '• Subscription Management',
            '',
            'What would you like to manage? 📱'
        ]);
    });

// Billing flow
const billingFlow = addKeyword(['4', 'billing', 'payment', 'invoice'])
    .addAnswer('💳 *Billing & Payments*', null, async (ctx, { flowDynamic }) => {
        await flowDynamic([
            'Let me assist with billing matters!',
            '',
            '• Invoice Questions',
            '• Payment Methods',
            '• Billing History',
            '• Refund Processing',
            '',
            'How can I help with billing? 💰'
        ]);
    });

// Agent escalation flow
const agentFlow = addKeyword(['5', 'agent', 'human', 'representative'])
    .addAnswer('👨‍💼 *Human Agent Connection*', null, async (ctx, { flowDynamic, state }) => {
        try {
            const userPhone = ctx.from;
            const currentState = await state.get();
            const userName = currentState.userName || 'Customer';

            logger.userInteraction(userPhone, 'escalation_requested', { userName });

            await state.update({
                escalationRequested: true,
                escalationTime: new Date()
            });

            await flowDynamic([
                `Thank you ${userName}! 🙏`,
                '',
                '🔄 *Connecting you to a human agent...*',
                '⏱️ *Current wait time: 2-3 minutes*',
                '',
                '📝 *While you wait:*',
                '• Your conversation history has been shared',
                '• An agent will join this chat shortly',
                '• You\'ll receive notification when connected',
                '',
                '⚡ *Stay in this chat - help is on the way!*'
            ]);

        } catch (error) {
            logger.error('Error in agent flow:', error);
            await flowDynamic('Connecting you to support. Please wait...');
        }
    });

// AI-powered fallback for unmatched messages
const aiFlow = addKeyword([''])
    .addAction(async (ctx, { flowDynamic, state }) => {
        try {
            const userPhone = ctx.from;
            const userMessage = ctx.body;

            // Skip if message matches other flows
            const lowerMessage = userMessage.toLowerCase().trim();
            if (['hello', 'hi', 'hey', 'start', 'menu', '1', '2', '3', '4', '5', 'agent'].includes(lowerMessage)) {
                return;
            }

            logger.userInteraction(userPhone, 'ai_interaction', { message: userMessage });

            const currentState = await state.get();
            const conversationHistory = currentState.conversationHistory || [];

            const userProfile = {
                name: currentState.userName,
                phone: userPhone
            };

            // Generate AI response
            const aiResponse = await azureOpenAI.generateContextualResponse(
                userMessage,
                conversationHistory,
                userProfile
            );

            // Update conversation history
            const updatedHistory = [
                ...conversationHistory,
                { role: 'user', content: userMessage, timestamp: new Date() },
                { role: 'assistant', content: aiResponse.content, timestamp: new Date() }
            ].slice(-10);

            await state.update({
                conversationHistory: updatedHistory,
                lastInteraction: new Date()
            });

            await flowDynamic(aiResponse.content);

            logger.aiUsage('chat_completion', aiResponse.usage?.total_tokens || 0, { userPhone });

        } catch (error) {
            logger.error('Error in AI flow:', error);
            await flowDynamic([
                '🛠️ I apologize for the technical difficulty.',
                'Let me connect you with a human agent.',
                'Type "agent" for immediate assistance.'
            ]);
        }
    });

async function startBot() {
    try {
        console.log('\n🚀 Starting Enterprise WhatsApp Bot...\n');

        // Initialize database
        const database = new JsonFileDB({
            filename: 'data/bot_database.json'
        });

        // Initialize WhatsApp provider with QR code handler
        const provider = createProvider(BaileysProvider, {
            name: config.bot.name
        });

        // Enhanced QR code display
        provider.on('qr', async (qr) => {
            console.log('\n📱 SCAN THIS QR CODE WITH WHATSAPP:\n');
            console.log('════════════════════════════════════════════════════════════');

            // Generate QR code in terminal
            qrcode.generate(qr, { small: true }, (qrString) => {
                console.log(qrString);
            });

            // Also save QR code as image file
            try {
                await QRCode.toFile('logs/qr-code.png', qr);
                console.log('💾 QR code also saved to: logs/qr-code.png');
            } catch (error) {
                console.log('⚠️  Could not save QR code to file:', error.message);
            }

            console.log('════════════════════════════════════════════════════════════');
            console.log('📱 Open WhatsApp > Settings > Linked Devices > Link a Device');
            console.log('⏱️  QR code expires in 20 seconds - scan quickly!');
            console.log('📁 If QR code is not visible above, check logs/qr-code.png');
            console.log('════════════════════════════════════════════════════════════\n');
        });

        provider.on('ready', () => {
            console.log('✅ WhatsApp connected successfully!');
            console.log('🤖 Bot is now active and ready to receive messages!');
            console.log('📞 Test by sending "hello" to your WhatsApp\n');
        });

        provider.on('auth_failure', () => {
            console.log('❌ Authentication failed. Please try scanning the QR code again.');
        });

        // Create bot flows
        const flow = createFlow([
            welcomeFlow,
            menuFlow,
            productFlow,
            supportFlow,
            accountFlow,
            billingFlow,
            agentFlow,
            aiFlow
        ]);

        // Create the bot
        const bot = createBot({
            flow,
            provider,
            database
        });

        // Error handlers
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection:', { reason });
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down bot gracefully...');
            process.exit(0);
        });

        console.log('⚡ Bot initialization complete. Waiting for QR code...');

    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

startBot();