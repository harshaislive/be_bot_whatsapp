import { addKeyword } from '@builderbot/bot';
import { logger } from '../../utils/logger.js';

export const escalationFlow = addKeyword(['5', 'agent', 'human', 'representative', 'manager', 'escalate'])
    .addAnswer(
        '👨‍💼 *Human Agent Connection*',
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                const userPhone = ctx.from;
                const currentState = await state.get();
                const userName = currentState.userName || 'Customer';

                logger.userInteraction(userPhone, 'escalation_requested', {
                    userName,
                    reason: 'User requested human agent',
                    conversationDuration: currentState.conversationStart ?
                        Date.now() - new Date(currentState.conversationStart).getTime() : 0
                });

                // Update state with escalation info
                await state.update({
                    escalationRequested: true,
                    escalationTime: new Date(),
                    escalationReason: 'user_requested',
                    needsHumanAgent: true
                });

                await flowDynamic([
                    `Thank you ${userName}! 🙏`,
                    '',
                    '🔄 *Connecting you to a human agent...*',
                    '',
                    '⏱️ *Current wait time: 2-3 minutes*',
                    '',
                    '📝 *While you wait:*',
                    '• Your conversation history has been shared',
                    '• An agent will join this chat shortly',
                    '• You\'ll receive a notification when connected',
                    '',
                    '💡 *Need immediate help?*',
                    'Type "urgent" for priority assistance',
                    'Type "callback" to request a phone call',
                    '',
                    '⚡ *Stay in this chat - help is on the way!*'
                ]);

                // Simulate agent notification (in real implementation, this would trigger actual agent notification)
                logger.botActivity('agent_notification_sent', {
                    userPhone,
                    userName,
                    priority: 'normal',
                    context: currentState.currentContext || 'general',
                    conversationHistory: currentState.conversationHistory?.length || 0
                });

                // Set up automatic follow-up after 5 minutes if no agent responds
                setTimeout(async () => {
                    const updatedState = await state.get();
                    if (updatedState.needsHumanAgent && !updatedState.agentConnected) {
                        await flowDynamic([
                            '🕐 *Update on your request:*',
                            '',
                            'Our agents are currently experiencing high volume.',
                            'Your position in queue: #3',
                            '',
                            'Would you like to:',
                            '📞 Schedule a callback',
                            '📧 Send us an email',
                            '⏰ Try again later',
                            '',
                            'Type your preference or continue waiting.'
                        ]);
                    }
                }, 5 * 60 * 1000); // 5 minutes

            } catch (error) {
                logger.error('Error in escalation flow:', error);
                await flowDynamic([
                    'I apologize for the technical difficulty.',
                    'Please call our direct support line: +1-800-SUPPORT',
                    'Or email: support@company.com'
                ]);
            }
        }
    );

export const urgentFlow = addKeyword(['urgent', 'emergency', 'critical', 'asap'])
    .addAnswer(
        '🚨 *Priority Support Activated*',
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                const userPhone = ctx.from;
                const currentState = await state.get();

                logger.security('urgent_escalation', {
                    userPhone,
                    timestamp: new Date().toISOString(),
                    reason: 'User marked as urgent'
                });

                await state.update({
                    priority: 'urgent',
                    urgentReason: ctx.body,
                    escalationTime: new Date()
                });

                await flowDynamic([
                    '🔴 *URGENT REQUEST ESCALATED*',
                    '',
                    '✅ Senior agent has been notified',
                    '✅ Priority queue position assigned',
                    '✅ Expected response: < 60 seconds',
                    '',
                    '📞 *Emergency Contact:*',
                    'Call: +1-800-URGENT-1',
                    'Text: +1-555-HELP-NOW',
                    '',
                    'An agent will connect immediately. Please stand by...'
                ]);

                // In real implementation, this would trigger immediate agent notification
                logger.botActivity('urgent_agent_notification', {
                    userPhone,
                    priority: 'critical',
                    autoResponse: true
                });

            } catch (error) {
                logger.error('Error in urgent flow:', error);
            }
        }
    );

export const callbackFlow = addKeyword(['callback', 'call back', 'phone call', 'call me'])
    .addAnswer(
        '📞 *Callback Request*',
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                const userPhone = ctx.from;
                const currentState = await state.get();

                await flowDynamic([
                    '📞 *Callback Service*',
                    '',
                    'I can arrange a callback for you!',
                    '',
                    '🕐 *Available Times:*',
                    '• Now (if agents available)',
                    '• Within 1 hour',
                    '• Within 2 hours',
                    '• Tomorrow morning',
                    '',
                    '📱 *Callback Number:*',
                    `Is ${userPhone} the best number to reach you?`,
                    '',
                    'Reply with:',
                    '• "yes" to confirm this number',
                    '• Your preferred number',
                    '• Your preferred time slot'
                ]);

                await state.update({
                    callbackRequested: true,
                    callbackNumber: userPhone,
                    callbackTime: new Date()
                });

                logger.botActivity('callback_requested', {
                    userPhone,
                    requestTime: new Date().toISOString()
                });

            } catch (error) {
                logger.error('Error in callback flow:', error);
            }
        }
    );