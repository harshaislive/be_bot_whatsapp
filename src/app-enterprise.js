import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { azureOpenAI } from './ai/openai.js';
import { analyticsManager } from './middleware/analytics.js';
import { rateLimitManager } from './middleware/rateLimiter.js';
import { userProfileManager } from './utils/userProfileManager.js';
import { redisSessionManager as sessionManager } from './utils/redisSessionManager.js';
import { errorHandler } from './utils/errorHandler.js';
import { supabaseService } from './services/supabaseService.js';
import { templateService } from './services/templateService.js';
import { redisService } from './services/redisService.js';
import apiRoutes from './api/routes.js';
import { whatsappController } from './api/whatsappControl.js';

console.log('🚀 Starting Enterprise WhatsApp Bot');
console.log('===================================\n');

class EnterpriseWhatsAppBot {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.apiServer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.setupAPIServer();
    }

    async start() {
        try {
            logger.info('Initializing Enterprise WhatsApp Bot...', {
                nodeEnv: config.server.nodeEnv,
                features: Object.keys(config.features).filter(key => config.features[key])
            });

            console.log('📱 Setting up WhatsApp connection...');
            console.log('⚡ Loading enterprise features...');

            // Initialize Redis service for session persistence
            console.log('🔄 Initializing Redis service...');
            await redisService.initialize();

            // Initialize template service for dynamic messages
            console.log('📄 Initializing template service...');
            await templateService.initialize();

            // Initialize auth state
            const { state, saveCreds } = await useMultiFileAuthState('./wa_session');

            // Only clear auth if both Redis and local auth are empty (first time)
            const redisSession = await redisService.loadWhatsAppSession();
            const fs = await import('fs');
            const authPath = './wa_session';
            const hasLocalAuth = fs.existsSync(authPath) && fs.readdirSync(authPath).length > 0;

            if (!redisSession && !hasLocalAuth && redisService.getStatus().connected) {
                console.log('🔄 First time setup - no sessions found anywhere');
                logger.info('First time setup - no WhatsApp session found in Redis or locally');
            } else if (redisSession && !hasLocalAuth) {
                console.log('🔄 Redis has session but local auth missing, allowing fresh pairing...');
                logger.info('Redis session exists but local auth missing - allowing fresh pairing');
            }

            // Create WhatsApp socket
            this.socket = makeWASocket({
                auth: state,
                printQRInTerminal: false, // We handle QR ourselves
                defaultQueryTimeoutMs: 60000,
                browser: ['Enterprise Bot', 'Chrome', '1.0.0']
            });

            this.setupEventHandlers(saveCreds);

            console.log('⏳ Waiting for QR code generation...\n');

        } catch (error) {
            logger.error('Failed to start bot:', error);
            console.error('❌ Startup failed:', error.message);
            await this.cleanup();
            process.exit(1);
        }
    }

    setupAPIServer() {
        try {
            const app = express();

            // Middleware
            app.use(cors());
            app.use(express.json());
            app.use(express.urlencoded({ extended: true }));

            // API routes
            app.use('/api', apiRoutes);

            // Start API server on main port
            const apiPort = config.server.port; // Use main port 3000
            this.apiServer = app.listen(apiPort, () => {
                console.log(`🌐 API Server running on port ${apiPort}`);
                console.log(`📡 Endpoints available at http://localhost:${apiPort}/api`);
                logger.info(`API server started on port ${apiPort}`);
            });

            // Set bot instance for API controller
            whatsappController.setBotInstance(this);

        } catch (error) {
            logger.error('Failed to start API server:', error);
            console.error('⚠️ API server could not start:', error.message);
        }
    }

    async cleanup() {
        try {
            console.log('🧹 Cleaning up services...');

            // Close API server
            if (this.apiServer) {
                this.apiServer.close();
                console.log('🌐 API server closed');
            }

            // Disconnect Redis
            await redisService.disconnect();

            // Close WhatsApp socket
            if (this.socket) {
                this.socket.end();
            }

            logger.info('Cleanup completed successfully');
        } catch (error) {
            logger.error('Error during cleanup:', error);
        }
    }

    setupEventHandlers(saveCreds) {
        // Connection and QR handling
        this.socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                await this.displayQRCode(qr);
            }

            if (connection === 'close') {
                this.isConnected = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                // Log the disconnect reason for debugging
                logger.info('WhatsApp connection closed', {
                    statusCode,
                    reason: lastDisconnect?.error?.output?.payload?.message || 'Unknown',
                    shouldReconnect
                });

                if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;

                    // Add delay to prevent rapid reconnection loops
                    const reconnectDelay = statusCode === 515 ? 15000 : 5000; // 15s for stream errors, 5s for others

                    console.log(`🔄 Connection lost (${statusCode}), reconnecting in ${reconnectDelay/1000}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    logger.info(`Reconnecting in ${reconnectDelay/1000} seconds due to connection loss (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

                    setTimeout(() => this.start(), reconnectDelay);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.log('❌ Maximum reconnection attempts reached. Please restart the bot manually.');
                    logger.error('Maximum reconnection attempts reached - stopping reconnection');
                } else {
                    console.log('🚪 Logged out from WhatsApp');
                    logger.info('Bot logged out from WhatsApp - not reconnecting');
                }
            }

            if (connection === 'open') {
                this.isConnected = true;
                this.reconnectAttempts = 0; // Reset reconnection counter on success

                console.log('\n✅ SUCCESS! CONNECTED TO WHATSAPP!');
                console.log('🤖 Enterprise WhatsApp Bot is now ACTIVE!');
                console.log('📞 Ready to provide top-tier customer service');
                console.log('📝 Test by sending: "hello"\n');

                logger.info('🚀 Enterprise WhatsApp Bot connected successfully!', {
                    features: ['AI', 'Analytics', 'User Profiling', 'Session Management', 'Rate Limiting']
                });

                // Save WhatsApp session to Redis for persistence
                try {
                    await redisService.saveWhatsAppSession({
                        connected: true,
                        timestamp: new Date().toISOString(),
                        botNumber: this.socket?.user?.id || 'unknown'
                    });
                    console.log('💾 WhatsApp session saved to Redis');
                    logger.info('WhatsApp session saved to Redis for persistence');
                } catch (error) {
                    logger.warn('Failed to save WhatsApp session to Redis:', error);
                }
            }
        });

        // Save credentials
        this.socket.ev.on('creds.update', saveCreds);

        // Message handling with enterprise features
        this.socket.ev.on('messages.upsert', async (messageUpdate) => {
            await this.handleMessage(messageUpdate);
        });
    }

    async displayQRCode(qr) {
        console.log('\n🎉 QR CODE READY FOR SCANNING!\n');
        console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
        console.log('═'.repeat(50));

        // Display QR in terminal (compact size)
        qrcode.generate(qr, { small: true });

        // Save QR to file as backup
        try {
            await QRCode.toFile('./logs/whatsapp-qr.png', qr, {
                width: 300,
                margin: 2
            });
            console.log('\n💾 QR code saved as: logs/whatsapp-qr.png');
            console.log('📁 Open this file if QR is not visible above');
        } catch (err) {
            console.log('⚠️  Could not save QR file:', err.message);
        }

        console.log('\n═'.repeat(50));
        console.log('📱 HOW TO CONNECT:');
        console.log('1. Open WhatsApp → Settings → Linked Devices');
        console.log('2. Tap "Link a Device"');
        console.log('3. Scan QR code above');
        console.log('⏰ Expires in 20 seconds!');
        console.log('═'.repeat(50));
    }

    async handleMessage(messageUpdate) {
        try {
            const message = messageUpdate.messages[0];

            // Skip if message is from bot or has no content
            if (message.key.fromMe || !message.message) return;

            const userPhone = message.key.remoteJid;
            // Extract text content only (ignore media, documents, etc.)
            const messageText = message.message.conversation ||
                              message.message.extendedTextMessage?.text || '';

            // Skip non-text messages (images, videos, documents, etc.)
            if (!messageText || messageText.trim() === '') {
                console.log(`🚫 Ignoring non-text message from ${userPhone.split('@')[0]}`);
                return;
            }

            // Skip very long messages (potential spam or system messages)
            if (messageText.length > 500) {
                console.log(`🚫 Ignoring overly long message from ${userPhone.split('@')[0]} (${messageText.length} chars)`);
                return;
            }

            // 🚫 HARD FILTER: Only respond to direct personal messages

            // Block group messages (@g.us)
            if (userPhone.includes('@g.us')) {
                console.log(`🚫 Ignoring group message from ${userPhone} (group chat)`);
                return;
            }

            // Block broadcast messages (@broadcast)
            if (userPhone.includes('@broadcast')) {
                console.log(`🚫 Ignoring broadcast message from ${userPhone}`);
                return;
            }

            // Block status messages (@status)
            if (userPhone.includes('@status') || userPhone.includes('status@broadcast')) {
                console.log(`🚫 Ignoring status update from ${userPhone}`);
                return;
            }

            // Only process direct personal messages (must end with @s.whatsapp.net)
            if (!userPhone.endsWith('@s.whatsapp.net')) {
                console.log(`🚫 Ignoring non-personal message from ${userPhone} (unknown format)`);
                return;
            }

            console.log(`📨 Received direct message: "${messageText}" from ${userPhone.split('@')[0]}`);
            logger.userInteraction(userPhone, 'message_received', { message: messageText });

            // 🔥 IMMEDIATE TYPING INDICATOR - Show before any processing delays
            try {
                await this.socket.sendPresenceUpdate('composing', userPhone);
                console.log(`⌨️ IMMEDIATE typing indicator sent to ${userPhone.split('@')[0]}`);
            } catch (error) {
                logger.warn('Could not send immediate typing indicator:', error);
            }

            // Continue with processing (removed global fallback - too aggressive)

            // Rate limiting check
            const rateLimitCheck = await rateLimitManager.checkMessageLimit(userPhone);
            if (!rateLimitCheck.allowed) {
                await this.sendMessage(userPhone, rateLimitCheck.message);
                return;
            }

            // Analytics tracking
            analyticsManager.trackMessage(userPhone, messageText, 'user');

            // Get/create user profile
            const userProfile = await userProfileManager.getProfile(userPhone);
            await userProfileManager.recordInteraction(userPhone, {
                type: 'message',
                topic: this.extractTopic(messageText)
            });

            // Session management
            const session = await sessionManager.getSession(userPhone);
            await sessionManager.addToConversationHistory(userPhone, messageText, 'user');

            // 💾 Supabase Conversation Logging
            await this.handleConversationLogging(userPhone, messageText, session);

            // Handle different types of messages
            await this.processMessage(userPhone, messageText, userProfile, session);

        } catch (error) {
            console.log('❌ Error handling message:', error.message);
            logger.error('Error handling message:', error);

            const errorResponse = await errorHandler.handleError(error, {
                context: 'message_handling',
                phone: message?.key?.remoteJid
            });

            if (message?.key?.remoteJid) {
                console.log('📤 Sending error response to user');
                const sent = await this.sendMessage(message.key.remoteJid, errorResponse.userResponse);
                if (!sent) {
                    console.log('❌ Failed to send error response to user');
                }
            }
        }
    }

    async processMessage(userPhone, messageText, userProfile, session) {
        const lowerMessage = messageText.toLowerCase().trim();

        try {
            console.log(`⚡ Processing message: "${messageText}" (normalized: "${lowerMessage}")`);

            // Get session context first
            const sessionData = await sessionManager.getSession(userPhone);
            const context = sessionData.context || {};

            // 🚀 STATIC ROUTING - INSTANT RESPONSES (90% of cases)
            const staticRoute = await this.getStaticRoute(lowerMessage, messageText, context);
            if (staticRoute) {
                console.log(`⚡ Static route: ${staticRoute.handler} (${staticRoute.reason})`);
                await staticRoute.handler(userPhone, staticRoute.param, userProfile);
                return;
            }

            // 🤖 AI FALLBACK - Only for unrecognized natural language
            console.log('🤖 No static match found - using AI fallback');
            await this.handleAIFallback(userPhone, messageText, userProfile, context);

        } catch (error) {
            console.error('❌ Error in processMessage:', error);
            logger.error('Message processing error:', { error: error.message, userPhone, messageText });
            await this.sendQuickMessage(userPhone, 'Sorry, something went wrong. Type "menu" to continue.');
        }
    }

    // 🚀 STATIC PATTERN MATCHER - Handles 90% of inputs instantly
    async getStaticRoute(lowerMessage, originalMessage, context) {
        // 1. GREETINGS (exact matches)
        if (['hello', 'hi', 'hey', 'start', 'hola', 'oi', 'namaste'].includes(lowerMessage)) {
            return { handler: this.handleWelcome.bind(this), reason: 'greeting', param: null };
        }

        // 2. MENU REQUESTS (keyword detection)
        const menuKeywords = ['menu', 'help', 'options', '0', 'main', 'back', 'start over'];
        if (menuKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return { handler: this.handleMenu.bind(this), reason: 'menu_request', param: null };
        }

        // 3. FLOW-BASED ROUTING (context-aware)
        if (context.currentFlow === 'collective_info_gathering') {
            return { handler: this.handleCollectiveInfoSubmission.bind(this), reason: 'info_submission', param: originalMessage };
        }

        if (context.currentFlow === 'intent_confirmation') {
            return { handler: this.handleConfirmationResponse.bind(this), reason: 'confirmation', param: originalMessage };
        }

        // 4. DIRECT NUMBERED OPTIONS (main menu)
        if (['1', '2', '3', '4', '5'].includes(lowerMessage) && (!context.currentFlow || context.currentFlow === 'main_menu')) {
            return { handler: this.handleNumberedOption.bind(this), reason: 'main_menu_option', param: lowerMessage };
        }

        // 5. HOSPITALITY SUB-OPTIONS
        if (context.currentFlow === 'hospitality' && ['1', '2'].includes(lowerMessage)) {
            return { handler: this.handleHospitalitySubOption.bind(this), reason: 'hospitality_option', param: lowerMessage };
        }

        // 6. KEYWORD-BASED ROUTING (service-specific)

        // 6a. SPECIFIC ACCOMMODATION ROUTING (before general hospitality)
        // Handle direct mentions of specific properties with smart responses
        if (lowerMessage.includes('coorg') || lowerMessage.includes('blyton') || lowerMessage.includes('bungalow')) {
            return {
                handler: async (phone) => {
                    await this.handleSpecificAccommodation(phone, 'blyton');
                },
                reason: 'specific_accommodation_blyton',
                param: 'blyton'
            };
        }

        if (lowerMessage.includes('glamping') || lowerMessage.includes('hyderabad tent') || lowerMessage.includes('hyderabad camp')) {
            return {
                handler: async (phone) => {
                    await this.handleSpecificAccommodation(phone, 'glamping');
                },
                reason: 'specific_accommodation_glamping',
                param: 'glamping'
            };
        }

        const keywordRoutes = {
            // Collective Visit keywords
            collective: { handler: this.handleCollectiveVisit.bind(this), reason: 'collective_keyword' },
            'group visit': { handler: this.handleCollectiveVisit.bind(this), reason: 'collective_keyword' },
            'team outing': { handler: this.handleCollectiveVisit.bind(this), reason: 'collective_keyword' },

            // Experiences keywords
            experience: { handler: this.handleBeforestExperiences.bind(this), reason: 'experience_keyword' },
            'forest experience': { handler: this.handleBeforestExperiences.bind(this), reason: 'experience_keyword' },
            nature: { handler: this.handleBeforestExperiences.bind(this), reason: 'experience_keyword' },

            // Bewild keywords
            bewild: { handler: this.handleBewildProduce.bind(this), reason: 'bewild_keyword' },
            products: { handler: this.handleBewildProduce.bind(this), reason: 'bewild_keyword' },
            honey: { handler: this.handleBewildProduce.bind(this), reason: 'bewild_keyword' },

            // Hospitality keywords (general - after specific checks)
            accommodation: { handler: this.handleBeforestHospitality.bind(this), reason: 'hospitality_keyword' },
            stay: { handler: this.handleBeforestHospitality.bind(this), reason: 'hospitality_keyword' },
            booking: { handler: this.handleBeforestHospitality.bind(this), reason: 'hospitality_keyword' },

            // General query keywords
            query: { handler: this.handleGeneralQuery.bind(this), reason: 'query_keyword' },
            question: { handler: this.handleGeneralQuery.bind(this), reason: 'query_keyword' },
            support: { handler: this.handleGeneralQuery.bind(this), reason: 'query_keyword' },
            help: { handler: this.handleGeneralQuery.bind(this), reason: 'query_keyword' },
            contact: { handler: this.handleGeneralQuery.bind(this), reason: 'query_keyword' }
        };

        // Check keyword matches
        for (const [keyword, route] of Object.entries(keywordRoutes)) {
            if (lowerMessage.includes(keyword)) {
                return { handler: route.handler, reason: route.reason, param: null };
            }
        }

        // 7. COMMON RESPONSES (acknowledgments)
        const acknowledgeKeywords = ['thank you', 'thanks', 'ok', 'okay', 'good', 'great', 'perfect', 'yes', 'no'];
        if (acknowledgeKeywords.some(word => lowerMessage.includes(word))) {
            return {
                handler: async (phone) => {
                    await this.sendQuickMessage(phone, 'Happy to help! Type "menu" for more options.');
                },
                reason: 'acknowledgment',
                param: null
            };
        }

        // 8. ESCALATION REQUESTS
        if (['agent', 'human', 'representative', 'manager', 'escalate'].includes(lowerMessage)) {
            return { handler: this.handleEscalation.bind(this), reason: 'escalation_request', param: 'user_requested' };
        }

        // No static route found - will go to AI fallback
        return null;
    }

    // 🤖 AI FALLBACK HANDLER - Context-aware assistance for natural language
    async handleAIFallback(userPhone, messageText, userProfile, context) {
        console.log('🤖 AI Fallback triggered for natural language input');

        try {
            // Provide context to AI about current state
            const contextPrompt = this.buildContextPrompt(context, messageText);

            // Get AI response with context
            const conversationHistory = await sessionManager.getConversationHistory(userPhone, 3);
            const aiResponse = await azureOpenAI.generateContextualResponse(
                contextPrompt,
                conversationHistory,
                userProfile
            );

            // Check if AI is redirecting to General Query
            const aiContent = aiResponse.content.toLowerCase();
            const isRedirectingToQuery = aiContent.includes('general query') ||
                                        aiContent.includes('option 5') ||
                                        aiContent.includes('crm@beforest.co');

            // Send AI response with menu (faster than before)
            const fullResponse = this.formatAIResponseWithMenu(aiResponse.content);
            await this.sendMessageWithFallback(userPhone, fullResponse, {
                fallbackDelay: 2000,
                typingDuration: 500,
                context: 'ai_fallback'
            });

            // Update conversation history
            await sessionManager.addToConversationHistory(userPhone, fullResponse, 'assistant');
            console.log(`✅ AI fallback response sent${isRedirectingToQuery ? ' (redirected to General Query)' : ''}`);

        } catch (error) {
            console.error('❌ AI fallback error:', error);

            try {
                // Try to get error fallback template from database
                const template = await templateService.getTemplate('error_fallback');

                let errorMessage;
                if (template) {
                    errorMessage = template.content;
                    console.log('📄 Using dynamic error fallback template from database');
                } else {
                    errorMessage = templateService.getFallbackMessage('error_fallback');
                    console.log('⚠️  Using hardcoded error fallback - template not found');
                }

                await this.sendQuickMessage(userPhone, errorMessage);
            } catch (fallbackError) {
                // Ultimate emergency fallback
                console.error('❌ Error fallback template failed:', fallbackError);
                await this.sendQuickMessage(userPhone,
                    'I don\'t have that information right now.\n\n' +
                    'Type "menu" to see our services or contact us:\n' +
                    '📧 crm@beforest.co\n' +
                    '📞 +91 7680070541'
                );
            }
        }
    }

    // Build context-aware prompt for AI
    buildContextPrompt(context, messageText) {
        let prompt = `User message: "${messageText}"`;

        if (context.currentFlow) {
            prompt += `\nCurrent flow: ${context.currentFlow}`;
        }

        if (context.selectedCollective) {
            prompt += `\nSelected collective: ${context.selectedCollective}`;
        }

        prompt += '\n\nProvide a helpful response and guide them to the appropriate service option (1-5) if relevant.';

        return prompt;
    }

    async handleWelcome(userPhone, userProfile) {
        const userName = userProfile.personalInfo.name || 'there';

        try {
            // Get welcome message template from database
            const template = await templateService.renderTemplate('welcome_message', {
                name: userName
            });

            let welcomeMessage;
            if (template && template.renderedContent) {
                welcomeMessage = template.renderedContent;
                console.log('📄 Using dynamic welcome template from database');
            } else {
                // Fallback to hardcoded message
                welcomeMessage = templateService.getFallbackMessage('welcome_message').replace('{{name}}', userName);
                console.log('⚠️  Using fallback welcome message - template not found');
            }

            // Send welcome message (should be fast, no fallback needed)
            await this.sendContinueTypingMessage(userPhone, welcomeMessage, 400);
            console.log('📤 Sent Beforest welcome message');

            // Update user profile and session
            await userProfileManager.recordInteraction(userPhone, {
                type: 'welcome',
                topic: 'greeting'
            });

            await sessionManager.setContext(userPhone, {
                currentFlow: 'welcome',
                menuLevel: 1
            });

        } catch (error) {
            logger.error('Error in handleWelcome:', error);
            // Emergency fallback
            const fallbackMessage = `Hello ${userName}! Welcome to Beforest 🌿

Your gateway to authentic nature experiences and sustainable living.

*How can I help you today?*

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. General Query

Just type the number or say "menu" anytime!`;

            await this.sendContinueTypingMessage(userPhone, fallbackMessage, 400);
            console.log('📤 Sent emergency fallback welcome message');
        }
    }

    async handleMenu(userPhone) {
        try {
            // Get main menu template from database
            const template = await templateService.getTemplate('main_menu');

            let menuMessage;
            if (template) {
                menuMessage = template.content;
                console.log('📄 Using dynamic main menu template from database');
            } else {
                // Fallback to hardcoded message
                menuMessage = templateService.getFallbackMessage('main_menu');
                console.log('⚠️  Using fallback main menu - template not found');
            }

            await this.sendMessage(userPhone, menuMessage);
            console.log('📤 Sent Beforest menu');

            // Update session context
            await sessionManager.setContext(userPhone, {
                currentFlow: 'main_menu',
                menuLevel: 1
            });

        } catch (error) {
            logger.error('Error in handleMenu:', error);
            // Emergency fallback
            const fallbackMessage = `*Welcome to Beforest*

Please select an option:

1. *Collective Visit*
   Group experiences in restored forests

2. *Beforest Experiences*
   Forest activities & guided tours

3. *Bewild Produce*
   Sustainable forest ingredients

4. *Beforest Hospitality*
   Nature stays & accommodations

5. *General Query*
   Get support or schedule a call

*Just type the number to continue!*`;

            await this.sendMessage(userPhone, fallbackMessage);
            console.log('📤 Sent emergency fallback menu');
        }
    }

    async handleNumberedOption(userPhone, option, userProfile) {
        const session = await sessionManager.getSession(userPhone);
        const context = session.context || {};

        // Handle main menu options
        if (context.menuLevel === 1 || !context.menuLevel) {
            switch (option) {
                case '1':
                    await this.handleCollectiveVisit(userPhone);
                    break;
                case '2':
                    await this.handleBeforestExperiences(userPhone);
                    break;
                case '3':
                    await this.handleBewildProduce(userPhone);
                    break;
                case '4':
                    await this.handleBeforestHospitality(userPhone);
                    break;
                case '5':
                    await this.handleContactTeam(userPhone);
                    break;
                default:
                    await this.sendMessage(userPhone, 'Please select a valid option (1-5)');
            }
        }
        // Handle sub-menu options
        else if (context.menuLevel === 2) {
            if (context.parentOption === '4') { // Beforest Hospitality sub-menu
                await this.handleHospitalitySubOption(userPhone, option);
            }
        }
    }

    async handleCollectiveVisit(userPhone) {
        try {
            // Get collective visit template from database
            const template = await templateService.getTemplate('collective_visit_info');

            let message;
            if (template) {
                message = template.content;
                console.log('📄 Using dynamic collective visit template from database');
            } else {
                // Fallback to hardcoded message
                message = `*Collective Visit*

Please share these details in one message:

• Your name
• Email
• Purpose of visit
• Number of people
• Preferred date/time
• Special requirements (if any)`;
                console.log('⚠️  Using fallback collective visit info - template not found');
            }

            await this.sendContinueTypingMessage(userPhone, message, 300);
            console.log('📤 Sent collective visit info request');

            await sessionManager.setContext(userPhone, {
                currentFlow: 'collective_info_gathering',
                menuLevel: 0
            });

        } catch (error) {
            logger.error('Error in handleCollectiveVisit:', error);
            // Emergency fallback
            const fallbackMessage = `*Collective Visit*

Please share: Name, Email, Purpose, Number of people, Date/time, Special requirements`;

            await this.sendContinueTypingMessage(userPhone, fallbackMessage, 300);
            console.log('📤 Sent emergency fallback collective info request');
        }
    }

    async handleCollectiveInfoSubmission(userPhone, messageText) {
        // First, immediate acknowledgment
        await this.sendMessage(userPhone, 'Thank you! We\'ve received your details.', { typingDuration: 300 });

        // Small pause before confirmation
        await new Promise(resolve => setTimeout(resolve, 400));

        const confirmationMessage = [
            'Our team will review your request and get back to you within 24 hours.',
            '',
            'Need immediate assistance?',
            '📧 crm@beforest.co',
            '📞 +91 7680070541 (Mon-Fri, 10am-6pm)'
        ].join('\n');

        await this.sendContinueTypingMessage(userPhone, confirmationMessage, 400);
        console.log('📤 Sent collective visit confirmation');

        // Reset to main menu
        await sessionManager.setContext(userPhone, {
            currentFlow: 'main_menu',
            menuLevel: 1
        });

        // Log the submission for follow-up
        console.log(`📋 Collective visit info submitted:`, {
            userPhone: userPhone.split('@')[0],
            timestamp: new Date().toISOString(),
            info: messageText.substring(0, 200) + '...'
        });
    }

    async handleBeforestExperiences(userPhone) {
        try {
            // Get experiences template from database
            const template = await templateService.getTemplate('experiences_message');

            let message;
            if (template) {
                message = template.content;
                console.log('📄 Using dynamic experiences template from database');
            } else {
                // Fallback to hardcoded message
                message = `*Beforest Experiences*

Immersive nature journeys that leave you with joy and a sense of belonging.

Explore upcoming experiences:
https://experiences.beforest.co/`;
                console.log('⚠️  Using fallback experiences message - template not found');
            }

            await this.sendContinueTypingMessage(userPhone, message, 300);
            console.log('📤 Sent Beforest experiences link');

            await sessionManager.setContext(userPhone, {
                currentFlow: 'experiences',
                menuLevel: 0
            });

        } catch (error) {
            logger.error('Error in handleBeforestExperiences:', error);
            // Emergency fallback
            const fallbackMessage = `*Beforest Experiences*

Explore: https://experiences.beforest.co/`;

            await this.sendContinueTypingMessage(userPhone, fallbackMessage, 300);
            console.log('📤 Sent emergency fallback experiences message');
        }
    }

    async handleBewildProduce(userPhone) {
        try {
            // Get bewild produce template from database
            const template = await templateService.getTemplate('bewild_message');

            let message;
            if (template) {
                message = template.content;
                console.log('📄 Using dynamic bewild template from database');
            } else {
                // Fallback to hardcoded message
                message = `*Bewild Produce*

Good food from good practices — where forests and agriculture flourish together.

Discover more:
https://bewild.life/`;
                console.log('⚠️  Using fallback bewild message - template not found');
            }

            await this.sendContinueTypingMessage(userPhone, message, 300);
            console.log('📤 Sent Bewild produce link');

            await sessionManager.setContext(userPhone, {
                currentFlow: 'bewild_produce',
                menuLevel: 0
            });

        } catch (error) {
            logger.error('Error in handleBewildProduce:', error);
            // Emergency fallback
            const fallbackMessage = `*Bewild Produce*

Discover: https://bewild.life/`;

            await this.sendContinueTypingMessage(userPhone, fallbackMessage, 300);
            console.log('📤 Sent emergency fallback bewild message');
        }
    }

    async handleBeforestHospitality(userPhone) {
        try {
            // Get hospitality options template from database
            const template = await templateService.getTemplate('hospitality_options');

            let message;
            if (template) {
                message = template.content;
                console.log('📄 Using dynamic hospitality template from database');
            } else {
                // Fallback to hardcoded message
                message = `*Beforest Hospitality*

Choose your perfect stay:

1. *Blyton Bungalow, Poomaale Collective, Coorg*
   Heritage bungalow in coffee plantations

2. *Glamping, Hyderabad Collective*
   Luxury tents with modern amenities

Please select 1 or 2 to continue.`;
                console.log('⚠️  Using fallback hospitality message - template not found');
            }

            await this.sendMessage(userPhone, message);
            console.log('📤 Sent hospitality options');

            await sessionManager.setContext(userPhone, {
                currentFlow: 'hospitality',
                menuLevel: 2,
                parentOption: '4'
            });

        } catch (error) {
            logger.error('Error in handleBeforestHospitality:', error);
            // Emergency fallback
            const fallbackMessage = `*Beforest Hospitality*

Choose your perfect stay:

1. *Blyton Bungalow, Poomaale Collective, Coorg*
2. *Glamping, Hyderabad Collective*

Please select 1 or 2 to continue.`;

            await this.sendMessage(userPhone, fallbackMessage);
            console.log('📤 Sent emergency fallback hospitality message');
        }
    }

    async handleContactTeam(userPhone) {
        try {
            // Get contact team template from database
            const template = await templateService.getTemplate('contact_team_message');

            let message;
            if (template) {
                message = template.content;
                console.log('📄 Using dynamic contact team template from database');
            } else {
                // Fallback to hardcoded message
                message = `*Contact Us*

📧 crm@beforest.co
📞 +91 7680070541

*Available:* Monday to Friday, 10am-6pm`;
                console.log('⚠️  Using fallback contact team message - template not found');
            }

            await this.sendContinueTypingMessage(userPhone, message, 300);
            console.log('📤 Sent contact team info');

            await sessionManager.setContext(userPhone, {
                currentFlow: 'contact_team',
                menuLevel: 0
            });

        } catch (error) {
            logger.error('Error in handleContactTeam:', error);
            // Emergency fallback
            const fallbackMessage = `*Contact Us*

📧 crm@beforest.co
📞 +91 7680070541 (Mon-Fri, 10am-6pm)`;

            await this.sendContinueTypingMessage(userPhone, fallbackMessage, 300);
            console.log('📤 Sent emergency fallback contact team message');
        }
    }

    async handleSpecificAccommodation(userPhone, accommodationType) {
        if (accommodationType === 'blyton') {
            const message = [
                '*Blyton Bungalow, Poomaale Collective, Coorg*',
                '',
                'Eco-friendly luxury meets coffee plantations.',
                '',
                'Learn more and book:',
                'https://hospitality.beforest.co/',
                '',
                'For pricing & availability:',
                '📧 crm@beforest.co',
                '📞 +91 7680070541'
            ].join('\n');

            await this.sendContinueTypingMessage(userPhone, message, 300);
            console.log('📤 Sent Blyton Bungalow direct info');

        } else if (accommodationType === 'glamping') {
            const message = [
                '*Glamping, Hyderabad Collective*',
                '',
                'Luxury tents amidst striking rockscapes.',
                '',
                'Learn more and book:',
                'https://docs.google.com/forms/d/e/1FAIpQLSfnJDGgi6eSbx-pVdPrZQvgkqlxFuPja4UGaYLLyRBmYzx_zg/viewform',
                '',
                'For pricing & availability:',
                '📧 crm@beforest.co',
                '📞 +91 7680070541'
            ].join('\n');

            await this.sendContinueTypingMessage(userPhone, message, 300);
            console.log('📤 Sent Glamping direct info');
        }

        await sessionManager.setContext(userPhone, {
            currentFlow: 'hospitality_direct',
            menuLevel: 0
        });
    }

    async handleHospitalitySubOption(userPhone, option) {
        if (option === '1') {
            await this.handleSpecificAccommodation(userPhone, 'blyton');
        } else if (option === '2') {
            await this.handleSpecificAccommodation(userPhone, 'glamping');
        } else {
            await this.sendMessage(userPhone, 'Please select 1 for Blyton Bungalow or 2 for Glamping.');
        }
    }

    async handleIntentConfirmation(userPhone, originalMessage, recognizedOption, userProfile) {
        const optionNames = {
            '1': 'Collective Visit',
            '2': 'Beforest Experiences',
            '3': 'Bewild Produce',
            '4': 'Beforest Hospitality',
            '5': 'Contact Beforest Team'
        };

        const confirmationMessage = [
            `I understand you're interested in *${optionNames[recognizedOption]}*.`,
            '',
            'Is that correct?',
            '',
            `✓ Reply "yes" to continue`,
            `✓ Reply "no" to see all options`,
            `✓ Or type a number (1-5) directly`
        ].join('\n');

        await this.sendMessage(userPhone, confirmationMessage);
        console.log(`📤 Sent intent confirmation for option ${recognizedOption}`);

        // Set session context for confirmation handling
        await sessionManager.setContext(userPhone, {
            currentFlow: 'intent_confirmation',
            originalMessage: originalMessage,
            recognizedOption: recognizedOption,
            menuLevel: 1
        });
    }

    async handleConfirmationResponse(userPhone, messageText, userProfile, context) {
        const lowerMessage = messageText.toLowerCase().trim();

        if (['yes', 'y', 'correct', 'right', 'ok', 'okay'].includes(lowerMessage)) {
            console.log(`✅ User confirmed option ${context.recognizedOption}`);
            await this.handleNumberedOption(userPhone, context.recognizedOption, userProfile);
            return;
        }

        if (['no', 'n', 'wrong', 'incorrect', 'nope'].includes(lowerMessage)) {
            console.log('❌ User rejected suggestion - showing menu');
            await this.handleMenu(userPhone);
            return;
        }

        // Direct number selection during confirmation
        if (['1', '2', '3', '4', '5'].includes(lowerMessage)) {
            console.log(`➡️ User chose different option: ${lowerMessage}`);
            await this.handleNumberedOption(userPhone, lowerMessage, userProfile);
            return;
        }

        // If unclear, ask again
        const clarificationMessage = [
            'Please confirm:',
            '',
            '✓ Type "yes" to proceed',
            '✓ Type "no" for main menu',
            '✓ Or type a number (1-5)'
        ].join('\n');

        await this.sendMessage(userPhone, clarificationMessage);
    }

    async handleEscalation(userPhone, userProfile, reason) {
        const userName = userProfile.personalInfo.name || 'Customer';

        const escalationMessage = [
            `Thank you ${userName}!`,
            '',
            '*Connecting you to a human agent...*',
            '*Current wait time: 2-3 minutes*',
            '',
            '*Your conversation history has been shared*',
            '*An agent will join this chat shortly*',
            '',
            '*Stay in this chat - help is on the way!*'
        ].join('\n');

        await this.sendMessage(userPhone, escalationMessage);
        console.log('📤 Escalated to human agent');

        analyticsManager.trackEscalation(userPhone, reason);
        await sessionManager.markAsEscalated(userPhone, reason);
    }

    async handleAIConversation(userPhone, messageText, userProfile, session) {
        console.log('🤖 Processing with AI...');
        const startTime = Date.now();

        try {
            // Get conversation history
            const conversationHistory = await sessionManager.getConversationHistory(userPhone, 5);

            // Generate AI response with Beforest context
            const aiResponse = await azureOpenAI.generateContextualResponse(
                messageText,
                conversationHistory,
                userProfile
            );

            // Combine AI response with menu options
            const fullResponse = this.formatAIResponseWithMenu(aiResponse.content);

            // Send complete response with fallback for AI processing (only for AI - genuinely slow)
            await this.sendMessageWithFallback(userPhone, fullResponse, {
                fallbackDelay: 2500, // Show fallback after 2.5 seconds (reduced)
                typingDuration: 600,  // Much faster typing
                context: 'ai'
            });
            console.log('📤 Sent AI response with menu options');

            // Update conversation history
            await sessionManager.addToConversationHistory(userPhone, fullResponse, 'assistant');

            // Track metrics
            const responseTime = Date.now() - startTime;
            analyticsManager.trackMessage(userPhone, fullResponse, 'ai');

            logger.aiUsage('contextual_response', aiResponse.usage?.total_tokens || 0, {
                userPhone,
                responseTime,
                responseLength: fullResponse.length
            });

        } catch (error) {
            logger.error('AI conversation error:', error);
            await this.sendMessage(userPhone, 'I apologize for the technical difficulty. Let me connect you with a human agent. Type "agent" for assistance.');
        }
    }

    formatAIResponseWithMenu(aiResponse) {
        // Clean up the AI response and add menu options
        const cleanResponse = aiResponse.trim();

        const menuOptions = [
            '',
            '*What else can we help with?*',
            '',
            '1. Collective Visit',
            '2. Beforest Experiences',
            '3. Bewild Produce',
            '4. Beforest Hospitality',
            '5. Contact Us'
        ];

        return `${cleanResponse}\n\n${menuOptions.join('\n')}`;
    }

    async sendTypingMessage(userPhone, message, typingDuration = 1000) {
        // Specialized method for AI responses with longer typing duration
        return await this.sendMessage(userPhone, message, {
            showTyping: true,
            typingDuration
        });
    }

    async sendQuickMessage(userPhone, message) {
        // Quick response without typing indicator for menu/system messages
        return await this.sendMessage(userPhone, message, {
            showTyping: false
        });
    }

    async sendInstantMessage(userPhone, message) {
        // Instant response with minimal typing delay (for very quick replies)
        return await this.sendMessage(userPhone, message, {
            showTyping: true,
            typingDuration: 300 // Just 0.3 seconds
        });
    }

    // Fallback messages for longer processing (AI responses only)
    getFallbackMessage(context = 'general') {
        const messageGroups = {
            general: [
                "Just a moment...",
                "Processing your request...",
                "Almost ready...",
                "One moment please..."
            ],
            ai: [
                "Let me think about that...",
                "Processing your request...",
                "Getting the best answer for you...",
                "Just a moment..."
            ]
        };

        const messages = messageGroups[context] || messageGroups.general;
        return messages[Math.floor(Math.random() * messages.length)];
    }

    async sendFallbackMessage(userPhone, context = 'general') {
        const fallbackMsg = this.getFallbackMessage(context);
        console.log(`⏳ Sending fallback message: "${fallbackMsg}" (context: ${context})`);
        return await this.sendQuickMessage(userPhone, fallbackMsg);
    }

    async sendMessageWithFallback(userPhone, message, options = {}) {
        const { fallbackDelay = 2000, typingDuration = 400, context = 'general' } = options;
        let fallbackSent = false;

        // Set up fallback message timer
        const fallbackTimer = setTimeout(async () => {
            if (!fallbackSent) {
                fallbackSent = true;
                await this.sendFallbackMessage(userPhone, context);
            }
        }, fallbackDelay);

        try {
            // Send the actual message
            const result = await this.sendContinueTypingMessage(userPhone, message, typingDuration);

            // Clear the fallback timer since we sent the message
            clearTimeout(fallbackTimer);

            return result;
        } catch (error) {
            clearTimeout(fallbackTimer);
            throw error;
        }
    }

    async sendContinueTypingMessage(userPhone, message, typingDuration = 400) {
        // For responses where we already showed immediate typing indicator
        return await this.sendMessage(userPhone, message, {
            showTyping: true,
            skipInitialTyping: true, // Don't show typing again, just wait
            typingDuration
        });
    }

    // Helper method to determine typing duration based on message type
    getTypingDuration(messageType, messageLength = 0) {
        const baseDuration = {
            'ai': 600,         // AI responses: 0.6 seconds (super fast!)
            'welcome': 400,    // Welcome messages: 0.4 seconds
            'service': 300,    // Service info: 0.3 seconds
            'menu': 200,       // Menu responses: 0.2 seconds
            'quick': 0         // Quick responses: no typing
        };

        let duration = baseDuration[messageType] || 400;

        // Adjust for message length (longer messages = longer typing)
        if (messageLength > 500) {
            duration += 200; // Add 0.2 seconds for long messages
        }

        return Math.min(duration, 800); // Max 0.8 seconds typing (super fast!)
    }

    async sendMessage(userPhone, message, options = {}) {
        try {
            // Check if bot is connected
            if (!this.isConnected || !this.socket) {
                console.log('❌ Cannot send message: Bot not connected');
                logger.error('Attempted to send message while disconnected', { userPhone });
                return false;
            }

            const { showTyping = true, typingDuration = 400, skipInitialTyping = false } = options;

            // Show typing indicator if enabled (and not already shown)
            if (showTyping && !skipInitialTyping) {
                try {
                    await this.socket.sendPresenceUpdate('composing', userPhone);
                    console.log(`⌨️ Showing typing indicator to ${userPhone.split('@')[0]}`);
                } catch (typingError) {
                    logger.warn('Could not send typing indicator:', typingError);
                }
            }

            // Wait for typing duration (simulates thinking/typing time)
            if (showTyping && typingDuration > 0) {
                await new Promise(resolve => setTimeout(resolve, typingDuration));
            }

            // Send message with timeout
            console.log(`📤 Sending to ${userPhone.split('@')[0]}: "${message.substring(0, 50)}..."`);

            await Promise.race([
                this.socket.sendMessage(userPhone, { text: message }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Message send timeout')), 10000)
                )
            ]);

            // Clear typing indicator
            if (showTyping) {
                try {
                    await this.socket.sendPresenceUpdate('available', userPhone);
                } catch (presenceError) {
                    logger.warn('Could not clear presence:', presenceError);
                }
            }

            console.log('✅ Message sent successfully');

            // 💾 Log bot response to Supabase
            await this.logBotMessage(userPhone, message);

            return true;

        } catch (error) {
            console.log(`❌ Failed to send message: ${error.message}`);
            logger.error('Error sending message:', {
                error: error.message,
                userPhone,
                messageLength: message.length,
                isConnected: this.isConnected
            });

            // Attempt to reconnect if connection lost
            if (error.message.includes('Connection') || error.message.includes('Socket')) {
                console.log('🔄 Connection issue detected, attempting to reconnect...');
                this.isConnected = false;
                setTimeout(() => this.start(), 2000);
            }

            return false;
        }
    }

    async handleConversationLogging(userPhone, messageText, session) {
        try {
            // Check if this is a new conversation
            if (!session.supabaseConversationId) {
                // Create new conversation in Supabase
                const conversationId = await supabaseService.createConversation(userPhone, messageText);

                if (conversationId) {
                    // Store conversation ID in session for future messages
                    await sessionManager.setContext(userPhone, {
                        ...session.context,
                        supabaseConversationId: conversationId
                    });
                    console.log(`💾 Created new conversation: ${conversationId}`);
                }
            }

            // Log user message
            const currentSession = await sessionManager.getSession(userPhone);
            const conversationId = session.context?.supabaseConversationId ||
                                 currentSession.context?.supabaseConversationId;

            if (conversationId) {
                await supabaseService.logMessage(
                    conversationId,
                    userPhone,
                    messageText,
                    'user',
                    {
                        timestamp: new Date().toISOString(),
                        platform: 'whatsapp'
                    }
                );
                console.log(`💾 Logged user message to conversation: ${conversationId}`);
            }

        } catch (error) {
            logger.error('Error in conversation logging:', error);
            // Don't let logging errors break the main flow
        }
    }

    async logBotMessage(userPhone, message) {
        try {
            const session = await sessionManager.getSession(userPhone);
            const conversationId = session.context?.supabaseConversationId;

            if (conversationId) {
                await supabaseService.logMessage(
                    conversationId,
                    userPhone,
                    message,
                    'bot',
                    {
                        timestamp: new Date().toISOString(),
                        platform: 'whatsapp'
                    }
                );
                console.log(`💾 Logged bot response to conversation: ${conversationId}`);
            }

        } catch (error) {
            logger.error('Error logging bot message:', error);
            // Don't let logging errors break the main flow
        }
    }

    extractTopic(message) {
        const topics = {
            'product': ['product', 'buy', 'purchase', 'catalog', 'price'],
            'technical': ['error', 'bug', 'broken', 'issue', 'problem', 'help'],
            'account': ['account', 'profile', 'login', 'password'],
            'billing': ['billing', 'payment', 'invoice', 'charge', 'refund']
        };

        const lowerMessage = message.toLowerCase();
        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                return topic;
            }
        }
        return 'general';
    }
}

// Create and start the bot
const bot = new EnterpriseWhatsAppBot();

// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Enterprise WhatsApp Bot...');
    console.log('👋 Bot stopped gracefully');
    process.exit(0);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await bot.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await bot.cleanup();
    process.exit(0);
});

process.on('uncaughtException', async (error) => {
    console.error('🚨 Uncaught Exception:', error);
    logger.error('Uncaught Exception:', error);
    await bot.cleanup();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    logger.error('Unhandled Rejection:', { reason, promise });
    await bot.cleanup();
    process.exit(1);
});

// Start the bot
bot.start().catch(async (error) => {
    console.error('Failed to start bot:', error);
    await bot.cleanup();
    process.exit(1);
});