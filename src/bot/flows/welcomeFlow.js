import { addKeyword } from '@builderbot/bot';
import { azureOpenAI } from '../../ai/openai.js';
import { logger } from '../../utils/logger.js';

export const welcomeFlow = addKeyword(['hello', 'hi', 'hey', 'start', 'hola', 'oi'])
    .addAnswer(
        '🎉 Welcome to our Enterprise Support Center! I\'m your AI assistant.',
        null,
        async (ctx, { flowDynamic, state, gotoFlow }) => {
            try {
                const userPhone = ctx.from;
                const userName = ctx.pushName || 'Valued Customer';

                logger.userInteraction(userPhone, 'welcome_flow_started', {
                    userName,
                    timestamp: new Date().toISOString()
                });

                // Store user info in state
                await state.update({
                    userPhone,
                    userName,
                    conversationStart: new Date(),
                    conversationHistory: []
                });

                // Generate personalized welcome message using AI
                const welcomeMessage = await azureOpenAI.generateContextualResponse(
                    `User ${userName} just started a conversation`,
                    [],
                    { name: userName, language: 'en' }
                );

                await flowDynamic([
                    `Hi ${userName}! 👋`,
                    welcomeMessage.content,
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
        }
    );