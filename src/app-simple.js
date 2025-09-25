import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot';
import pkg from '@builderbot/database-json';
const { JsonFileDB } = pkg;
import { BaileysProvider } from '@builderbot/provider-baileys';

// Simple welcome flow
const welcomeFlow = addKeyword(['hello', 'hi', 'hey', 'start', 'hola'])
    .addAnswer('🎉 Welcome to our Enterprise WhatsApp Bot!', null, async (ctx, { flowDynamic }) => {
        const userName = ctx.pushName || 'Customer';
        await flowDynamic([
            `Hi ${userName}! 👋`,
            'I\'m your AI assistant. How can I help you today?',
            '',
            '📋 Quick Options:',
            '1️⃣ Product Info',
            '2️⃣ Support',
            '3️⃣ Account Help',
            '4️⃣ Billing',
            '5️⃣ Live Agent',
            '',
            'Just type a number or describe what you need!'
        ]);
    });

async function main() {
    console.log('🚀 Starting Simple WhatsApp Bot...');

    try {
        // Initialize database
        const database = new JsonFileDB({
            filename: 'data/bot_database.json'
        });

        // Initialize WhatsApp provider
        const provider = createProvider(BaileysProvider, {
            name: 'Enterprise WhatsApp Bot'
        });

        // Create bot flow
        const flow = createFlow([welcomeFlow]);

        // Create the bot
        const bot = createBot({
            flow,
            provider,
            database
        });

        console.log('✅ Bot started successfully!');
        console.log('📱 Scan the QR code above to connect WhatsApp');

    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

main();