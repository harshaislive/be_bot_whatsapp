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

    // ============================================
    // WhatsApp Session Management (NEW)
    // ============================================

    async saveWhatsAppSession(sessionData) {
        if (!this.client) {
            logger.warn('Supabase not configured - skipping WhatsApp session save');
            return false;
        }

        try {
            const { data, error } = await this.client
                .from('whatsapp_sessions')
                .upsert({
                    id: '00000000-0000-0000-0000-000000000001', // Single session (we only have one bot)
                    bot_number: sessionData.botNumber || null,
                    connected: sessionData.connected || false,
                    session_data: sessionData.metadata || {},
                    last_connected: sessionData.connected ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' })
                .select()
                .single();

            if (error) {
                logger.error('Error saving WhatsApp session to Supabase:', error);
                return false;
            }

            logger.info('WhatsApp session saved to Supabase', {
                botNumber: sessionData.botNumber,
                connected: sessionData.connected
            });

            return true;
        } catch (error) {
            logger.error('Failed to save WhatsApp session:', error);
            return false;
        }
    }

    async loadWhatsAppSession() {
        if (!this.client) {
            logger.warn('Supabase not configured - skipping WhatsApp session load');
            return null;
        }

        try {
            const { data, error } = await this.client
                .from('whatsapp_sessions')
                .select('*')
                .eq('id', '00000000-0000-0000-0000-000000000001')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No session found - this is normal on first run
                    logger.info('No WhatsApp session found in Supabase');
                    return null;
                }
                logger.error('Error loading WhatsApp session from Supabase:', error);
                return null;
            }

            logger.info('WhatsApp session loaded from Supabase', {
                botNumber: data.bot_number,
                connected: data.connected,
                lastConnected: data.last_connected
            });

            return {
                botNumber: data.bot_number,
                connected: data.connected,
                metadata: data.session_data,
                lastConnected: data.last_connected,
                timestamp: data.updated_at
            };
        } catch (error) {
            logger.error('Failed to load WhatsApp session:', error);
            return null;
        }
    }

    async deleteWhatsAppSession() {
        if (!this.client) {
            logger.warn('Supabase not configured - skipping WhatsApp session delete');
            return false;
        }

        try {
            const { error } = await this.client
                .from('whatsapp_sessions')
                .delete()
                .eq('id', '00000000-0000-0000-0000-000000000001');

            if (error) {
                logger.error('Error deleting WhatsApp session from Supabase:', error);
                return false;
            }

            logger.info('WhatsApp session deleted from Supabase');
            return true;
        } catch (error) {
            logger.error('Failed to delete WhatsApp session:', error);
            return false;
        }
    }

    async getWhatsAppSessionStatus() {
        if (!this.client) return { connected: false, hasSession: false };

        try {
            const { data, error } = await this.client
                .from('whatsapp_sessions')
                .select('connected, bot_number, last_connected')
                .eq('id', '00000000-0000-0000-0000-000000000001')
                .single();

            if (error || !data) {
                return { connected: false, hasSession: false };
            }

            return {
                connected: data.connected || false,
                hasSession: true,
                botNumber: data.bot_number,
                lastConnected: data.last_connected
            };
        } catch (error) {
            logger.error('Failed to get WhatsApp session status:', error);
            return { connected: false, hasSession: false };
        }
    }
}

export const supabaseService = new SupabaseService();