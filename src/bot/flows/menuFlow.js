import { addKeyword } from '@builderbot/bot';
import { logger } from '../../utils/logger.js';

export const menuFlow = addKeyword(['menu', '0', 'options', 'help'])
    .addAnswer(
        '📋 *Main Menu*\n\nPlease choose an option:',
        {
            buttons: [
                { body: '🛍️ Products' },
                { body: '🔧 Support' },
                { body: '👤 Account' }
            ]
        },
        async (ctx, { flowDynamic, state }) => {
            try {
                const userPhone = ctx.from;
                logger.userInteraction(userPhone, 'menu_accessed');

                await flowDynamic([
                    '*Quick Menu Options:*',
                    '',
                    '1️⃣ *Product Information*',
                    '   • Catalog & Features',
                    '   • Pricing & Plans',
                    '   • New Releases',
                    '',
                    '2️⃣ *Technical Support*',
                    '   • Troubleshooting',
                    '   • Setup Assistance',
                    '   • Bug Reports',
                    '',
                    '3️⃣ *Account Management*',
                    '   • Profile Settings',
                    '   • Order History',
                    '   • Preferences',
                    '',
                    '4️⃣ *Billing & Payments*',
                    '   • Invoice Queries',
                    '   • Payment Methods',
                    '   • Refund Requests',
                    '',
                    '5️⃣ *Live Agent*',
                    '   • Speak to Human',
                    '   • Escalate Issue',
                    '   • Complex Queries',
                    '',
                    '📝 *Or simply describe what you need!*',
                    'I understand natural language and can help with anything.'
                ]);

                // Update state with menu access
                await state.update({
                    lastMenuAccess: new Date(),
                    currentContext: 'main_menu'
                });

            } catch (error) {
                logger.error('Error in menu flow:', error);
                await flowDynamic('Menu temporarily unavailable. Please describe what you need!');
            }
        }
    );

export const productFlow = addKeyword(['1', 'product', 'products', 'catalog'])
    .addAnswer(
        '🛍️ *Product Information*',
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                const userPhone = ctx.from;
                logger.userInteraction(userPhone, 'product_flow_accessed');

                await flowDynamic([
                    'What would you like to know about our products?',
                    '',
                    '• *Features & Specifications*',
                    '• *Pricing & Plans*',
                    '• *Availability*',
                    '• *Comparisons*',
                    '• *New Releases*',
                    '',
                    'Just ask me anything about our products! 🚀'
                ]);

                await state.update({
                    currentContext: 'products',
                    contextData: { category: 'product_inquiry' }
                });

            } catch (error) {
                logger.error('Error in product flow:', error);
            }
        }
    );

export const supportFlow = addKeyword(['2', 'support', 'technical', 'help', 'issue'])
    .addAnswer(
        '🔧 *Technical Support*',
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                const userPhone = ctx.from;
                logger.userInteraction(userPhone, 'support_flow_accessed');

                await flowDynamic([
                    'I\'m here to help with technical issues!',
                    '',
                    '*Common Solutions:*',
                    '• Setup & Installation',
                    '• Troubleshooting',
                    '• Performance Issues',
                    '• Configuration Help',
                    '• Error Resolution',
                    '',
                    'Please describe your technical issue in detail. 🛠️'
                ]);

                await state.update({
                    currentContext: 'technical_support',
                    contextData: { category: 'technical_issue' }
                });

            } catch (error) {
                logger.error('Error in support flow:', error);
            }
        }
    );

export const accountFlow = addKeyword(['3', 'account', 'profile', 'settings'])
    .addAnswer(
        '👤 *Account Management*',
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                const userPhone = ctx.from;
                logger.userInteraction(userPhone, 'account_flow_accessed');

                await flowDynamic([
                    'Account management at your service!',
                    '',
                    '*Available Services:*',
                    '• Profile Updates',
                    '• Security Settings',
                    '• Order History',
                    '• Subscription Management',
                    '• Data Export',
                    '',
                    'What would you like to manage today? 📱'
                ]);

                await state.update({
                    currentContext: 'account_management',
                    contextData: { category: 'account_related' }
                });

            } catch (error) {
                logger.error('Error in account flow:', error);
            }
        }
    );

export const billingFlow = addKeyword(['4', 'billing', 'payment', 'invoice', 'refund'])
    .addAnswer(
        '💳 *Billing & Payments*',
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                const userPhone = ctx.from;
                logger.userInteraction(userPhone, 'billing_flow_accessed');

                await flowDynamic([
                    'Let me assist with billing matters!',
                    '',
                    '*Services Available:*',
                    '• Invoice Questions',
                    '• Payment Methods',
                    '• Billing History',
                    '• Refund Processing',
                    '• Plan Changes',
                    '',
                    'How can I help with your billing today? 💰'
                ]);

                await state.update({
                    currentContext: 'billing_support',
                    contextData: { category: 'billing_related' }
                });

            } catch (error) {
                logger.error('Error in billing flow:', error);
            }
        }
    );