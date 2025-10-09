import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import azureOpenAI from './ai/openai.js';
import logger from './utils/logger.js';

/**
 * SIMPLIFIED LLM-FIRST WHATSAPP BOT
 *
 * Philosophy: Let AI handle everything intelligently
 * - No complex flow states or routing
 * - AI uses comprehensive knowledge base to respond
 * - Minimal code, maximum intelligence
 */

class SimpleLLMBot {
    constructor() {
        this.sock = null;
        this.conversationHistory = new Map(); // userPhone -> messages[]
    }

    // Initialize WhatsApp connection
    async start() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: 'silent' }),
            browser: ['Beforest Support', 'Chrome', '1.0.0']
        });

        this.sock.ev.on('creds.update', saveCreds);
        this.sock.ev.on('connection.update', this.handleConnection.bind(this));
        this.sock.ev.on('messages.upsert', this.handleMessages.bind(this));

        logger.info('✅ Simplified LLM Bot started');
    }

    // Handle connection events
    async handleConnection(update) {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.info('Connection closed. Reconnecting:', shouldReconnect);

            if (shouldReconnect) {
                await this.start();
            }
        } else if (connection === 'open') {
            logger.info('✅ WhatsApp connected successfully');
        }
    }

    // Handle incoming messages
    async handleMessages(m) {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const userPhone = msg.key.remoteJid;
            const messageText = msg.message.conversation ||
                              msg.message.extendedTextMessage?.text || '';

            // Filter: Only respond to individual messages
            if (userPhone.includes('@g.us') ||
                userPhone.includes('@broadcast') ||
                userPhone.includes('status@broadcast')) {
                return;
            }

            logger.info(`📩 Message from ${userPhone}: ${messageText}`);

            // Process with AI
            await this.processWithAI(userPhone, messageText);

        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }

    // Get conversation history for context
    getHistory(userPhone, limit = 5) {
        const history = this.conversationHistory.get(userPhone) || [];
        return history.slice(-limit);
    }

    // Add to conversation history
    addToHistory(userPhone, role, content) {
        if (!this.conversationHistory.has(userPhone)) {
            this.conversationHistory.set(userPhone, []);
        }

        const history = this.conversationHistory.get(userPhone);
        history.push({ role, content, timestamp: new Date() });

        // Keep only last 10 messages
        if (history.length > 10) {
            history.shift();
        }
    }

    // Process message with AI
    async processWithAI(userPhone, messageText) {
        try {
            // Add user message to history
            this.addToHistory(userPhone, 'user', messageText);

            // Get conversation context
            const history = this.getHistory(userPhone);

            // Let AI handle everything
            const aiResponse = await azureOpenAI.generateSimpleResponse(
                messageText,
                history
            );

            // Send response
            await this.sendMessage(userPhone, aiResponse.content);

            // Add bot response to history
            this.addToHistory(userPhone, 'assistant', aiResponse.content);

            logger.info(`✅ AI response sent to ${userPhone}`);

        } catch (error) {
            logger.error('Error processing with AI:', error);

            // Fallback message
            const fallback = `Sorry, I'm having trouble right now. Please contact our team at +91 7680070541.`;
            await this.sendMessage(userPhone, fallback);
        }
    }

    // Send message
    async sendMessage(userPhone, text) {
        try {
            await this.sock.sendMessage(userPhone, { text });
        } catch (error) {
            logger.error('Error sending message:', error);
        }
    }
}

// Start the bot
const bot = new SimpleLLMBot();
bot.start().catch(err => {
    logger.error('Failed to start bot:', err);
    process.exit(1);
});
