import { addKeyword, EVENTS } from '@builderbot/bot';
import { azureOpenAI } from '../../ai/openai.js';
import { logger } from '../../utils/logger.js';
import { escalationFlow } from './escalationFlow.js';

export const aiFlow = addKeyword(['ai', 'help', 'assist'])
    .addAnswer(
        'Let me help you with that...',
        null,
        async (ctx, { flowDynamic, state, gotoFlow }) => {
            try {
                const userPhone = ctx.from;
                const userMessage = ctx.body;
                const currentState = await state.get();

                logger.userInteraction(userPhone, 'ai_interaction', {
                    message: userMessage,
                    timestamp: new Date().toISOString()
                });

                // Get conversation history from state
                const conversationHistory = currentState.conversationHistory || [];
                const userProfile = {
                    name: currentState.userName,
                    phone: userPhone,
                    preferences: currentState.preferences || {}
                };

                // Check for escalation need
                const needsEscalation = await azureOpenAI.checkForEscalation(
                    userMessage,
                    conversationHistory
                );

                if (needsEscalation) {
                    logger.botActivity('escalation_triggered', { userPhone, reason: 'AI detected escalation need' });
                    return gotoFlow(escalationFlow);
                }

                // Analyze sentiment
                const sentiment = await azureOpenAI.analyzeSentiment(userMessage);
                logger.botActivity('sentiment_analyzed', { userPhone, sentiment });

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
                ].slice(-10); // Keep last 10 messages

                await state.update({
                    conversationHistory: updatedHistory,
                    lastInteraction: new Date(),
                    sentiment
                });

                // Add typing delay for natural feel
                await new Promise(resolve => setTimeout(resolve, 1000));

                await flowDynamic(aiResponse.content);

                // Generate suggestions for follow-up (optional)
                if (Math.random() > 0.7) { // 30% chance to show suggestions
                    const suggestions = await azureOpenAI.generateSuggestions(
                        `${userMessage} - ${aiResponse.content}`,
                        2
                    );

                    if (suggestions.length > 0) {
                        await flowDynamic([
                            '',
                            '*You might also be interested in:*',
                            ...suggestions
                        ]);
                    }
                }

                logger.aiUsage('chat_completion', aiResponse.usage?.total_tokens || 0, {
                    userPhone,
                    responseLength: aiResponse.content.length
                });

            } catch (error) {
                logger.error('Error in AI flow:', error);

                await flowDynamic([
                    'I apologize, but I\'m experiencing technical difficulties. 🛠️',
                    'Let me connect you with a human agent who can assist you better.',
                    '',
                    'Type "agent" to speak with someone immediately.'
                ]);
            }
        }
    );