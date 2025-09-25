import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class SupabaseService {
    constructor() {
        if (!config.supabase.url || !config.supabase.anonKey) {
            logger.warn('Supabase configuration missing - conversation logging disabled');
            this.client = null;
            return;
        }

        this.client = createClient(config.supabase.url, config.supabase.anonKey);
        logger.info('Supabase client initialized for conversation logging');
    }

    async createConversation(userPhone, initialMessage) {
        if (!this.client) {
            logger.warn('Supabase not configured - skipping conversation creation');
            return null;
        }

        try {
            // Ensure user exists in the bot_users table
            const userId = await this.ensureUserExists(userPhone);

            if (!userId) {
                logger.error('Failed to create/get user, skipping conversation creation');
                return null;
            }

            const { data, error } = await this.client
                .from('bot_conversations')
                .insert({
                    user_id: userId,
                    title: this.generateConversationTitle(initialMessage),
                    conversation_type: this.getConversationType(initialMessage),
                    status: 'active',
                    metadata: {
                        phone: userPhone,
                        platform: 'whatsapp',
                        bot_type: 'beforest_assistant',
                        initial_message: initialMessage
                    }
                })
                .select()
                .single();

            if (error) {
                logger.error('Error creating conversation in Supabase:', error);
                return null;
            }

            logger.info('Conversation created in Supabase', {
                conversationId: data.id,
                userPhone,
                title: data.title
            });

            return data.id;
        } catch (error) {
            logger.error('Failed to create conversation:', error);
            return null;
        }
    }

    async updateConversationActivity(conversationId) {
        if (!this.client || !conversationId) return;

        try {
            const { error } = await this.client
                .from('bot_conversations')
                .update({
                    last_activity: new Date().toISOString()
                })
                .eq('id', conversationId);

            if (error) {
                logger.error('Error updating conversation activity:', error);
            }
        } catch (error) {
            logger.error('Failed to update conversation activity:', error);
        }
    }

    async logMessage(conversationId, userPhone, message, messageType = 'user', metadata = {}) {
        if (!this.client) {
            logger.warn('Supabase not configured - skipping message logging');
            return;
        }

        try {
            // Clean phone number
            const cleanPhone = userPhone.replace('@s.whatsapp.net', '');

            // Insert message into bot_messages table
            const { data, error } = await this.client
                .from('bot_messages')
                .insert({
                    conversation_id: conversationId,
                    user_phone: cleanPhone,
                    message_text: message,
                    message_type: messageType,
                    intent_recognized: metadata.intent || null,
                    confidence_score: metadata.confidence || null,
                    processing_time_ms: metadata.processing_time || null,
                    metadata: {
                        ...metadata,
                        platform: 'whatsapp'
                    }
                })
                .select()
                .single();

            if (error) {
                logger.error('Error logging message to Supabase:', error);
                return null;
            }

            // Update conversation stats
            await this.client.rpc('update_conversation_stats', { conv_id: conversationId });

            logger.info('Message logged to bot_messages', {
                conversationId,
                messageId: data.id,
                messageType,
                messageLength: message.length
            });

            return data.id;

        } catch (error) {
            logger.error('Failed to log message:', error);
            return null;
        }
    }

    async updateConversationMetadata(conversationId, newMetadata) {
        if (!this.client || !conversationId) return;

        try {
            // Get current metadata
            const { data: current } = await this.client
                .from('conversations')
                .select('metadata')
                .eq('id', conversationId)
                .single();

            const updatedMetadata = {
                ...(current?.metadata || {}),
                ...newMetadata
            };

            const { error } = await this.client
                .from('conversations')
                .update({
                    metadata: updatedMetadata,
                    last_activity: new Date().toISOString()
                })
                .eq('id', conversationId);

            if (error) {
                logger.error('Error updating conversation metadata:', error);
            }
        } catch (error) {
            logger.error('Failed to update conversation metadata:', error);
        }
    }

    async getMessageCount(conversationId) {
        if (!this.client || !conversationId) return 0;

        try {
            const { data } = await this.client
                .from('conversations')
                .select('metadata')
                .eq('id', conversationId)
                .single();

            return data?.metadata?.message_count || 0;
        } catch (error) {
            logger.error('Failed to get message count:', error);
            return 0;
        }
    }

    async ensureUserExists(userPhone) {
        if (!this.client) return null;

        try {
            // Clean phone number
            const cleanPhone = userPhone.replace('@s.whatsapp.net', '');

            // Use the PostgreSQL function to create/update user
            const { data, error } = await this.client
                .rpc('upsert_bot_user', { phone_num: cleanPhone });

            if (error) {
                logger.error('Error ensuring user exists:', error);
                return null;
            }

            return data; // Returns the user UUID
        } catch (error) {
            logger.error('Failed to ensure user exists:', error);
            return null;
        }
    }

    generateUserId(userPhone) {
        // Fallback method - clean phone number for ID generation
        const cleanPhone = userPhone.replace('@s.whatsapp.net', '');
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update(`whatsapp:${cleanPhone}`)
            .digest('hex')
            .substring(0, 32)
            .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
    }

    getConversationType(initialMessage) {
        if (!initialMessage) return 'chat';

        const message = initialMessage.toLowerCase().trim();

        if (message.includes('collective visit') || message.includes('group') || message.includes('team')) return 'booking';
        if (message.includes('accommodation') || message.includes('stay') || message.includes('hospitality')) return 'booking';
        if (message.includes('experience') || message.includes('activity') || message.includes('tour')) return 'inquiry';
        if (message.includes('product') || message.includes('bewild') || message.includes('buy')) return 'inquiry';
        if (message.includes('query') || message.includes('question') || message.includes('help')) return 'support';
        if (message.includes('complaint') || message.includes('problem') || message.includes('issue')) return 'support';

        return 'chat';
    }

    generateConversationTitle(initialMessage) {
        if (!initialMessage) return 'WhatsApp Conversation';

        // Extract meaningful title from initial message
        const message = initialMessage.toLowerCase().trim();

        if (message.includes('collective visit') || message.includes('group visit')) return 'Collective Visit Inquiry';
        if (message.includes('accommodation') || message.includes('stay') || message.includes('hospitality')) return 'Accommodation Inquiry';
        if (message.includes('experience') || message.includes('activity')) return 'Experience Inquiry';
        if (message.includes('product') || message.includes('bewild') || message.includes('buy')) return 'Product Inquiry';
        if (message.includes('query') || message.includes('question') || message.includes('help')) return 'General Query';

        // Greeting messages
        if (['hello', 'hi', 'hey', 'start'].some(word => message.includes(word))) return 'New Conversation';

        // Default title with first few words
        const words = initialMessage.split(' ').slice(0, 4).join(' ');
        return `Chat: ${words}...`.substring(0, 50);
    }

    async getConversationsByUser(userPhone, limit = 10) {
        if (!this.client) return [];

        try {
            const cleanPhone = userPhone.replace('@s.whatsapp.net', '');

            const { data, error } = await this.client
                .from('bot_conversation_summary')
                .select('*')
                .eq('phone_number', cleanPhone)
                .order('last_activity', { ascending: false })
                .limit(limit);

            if (error) {
                logger.error('Error fetching user conversations:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            logger.error('Failed to fetch user conversations:', error);
            return [];
        }
    }

    async logIntentRecognition(messageId, originalMessage, recognizedIntent, confidence, method) {
        if (!this.client || !messageId) return;

        try {
            const { error } = await this.client
                .from('bot_intents')
                .insert({
                    message_id: messageId,
                    original_message: originalMessage,
                    recognized_intent: recognizedIntent,
                    confidence_score: confidence,
                    processing_method: method
                });

            if (error) {
                logger.error('Error logging intent recognition:', error);
            }

        } catch (error) {
            logger.error('Failed to log intent recognition:', error);
        }
    }

    async updateDailyAnalytics() {
        if (!this.client) return;

        try {
            const { error } = await this.client.rpc('update_daily_analytics');

            if (error) {
                logger.error('Error updating daily analytics:', error);
            } else {
                logger.info('Daily analytics updated successfully');
            }

        } catch (error) {
            logger.error('Failed to update daily analytics:', error);
        }
    }
}

export const supabaseService = new SupabaseService();