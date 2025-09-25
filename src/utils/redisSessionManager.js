import { logger } from './logger.js';
import { redisService } from '../services/redisService.js';

class RedisSessionManager {
    constructor() {
        this.sessions = new Map(); // Fallback in-memory storage
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes

        // Start periodic cleanup
        this.startCleanup();
    }

    async createSession(phone, initialData = {}) {
        try {
            const sessionId = this.generateSessionId();
            const session = {
                id: sessionId,
                phone,
                startTime: new Date(),
                lastActivity: new Date(),
                status: 'active',
                context: {
                    currentFlow: 'welcome',
                    previousFlow: null,
                    waitingFor: null,
                    supabaseConversationId: null,
                    ...initialData.context
                },
                data: {
                    userName: initialData.userName || null,
                    language: initialData.language || 'en',
                    timezone: initialData.timezone || 'UTC',
                    ...initialData.data
                },
                conversation: {
                    messageCount: 0,
                    aiInteractions: 0,
                    escalationRequested: false,
                    escalationReason: null,
                    satisfaction: null,
                    history: []
                },
                flags: {
                    isFirstTime: !(await this.hasExistingSession(phone)),
                    needsOnboarding: true,
                    isVip: false,
                    isUrgent: false,
                    ...initialData.flags
                }
            };

            // Save to Redis
            await this.saveSessionToRedis(phone, session);

            // Also keep in memory as fallback
            this.sessions.set(phone, session);

            logger.info('Session created with Redis persistence', {
                sessionId,
                phone,
                isFirstTime: session.flags.isFirstTime
            });

            return session;
        } catch (error) {
            logger.error('Error creating session:', error);
            throw error;
        }
    }

    async getSession(phone) {
        try {
            // Try to get from Redis first
            let session = await this.loadSessionFromRedis(phone);

            if (!session) {
                // Check in-memory fallback
                session = this.sessions.get(phone);
            }

            if (!session) {
                return await this.createSession(phone);
            }

            // Check if session is expired
            if (this.isSessionExpired(session)) {
                logger.info('Session expired, creating new one', {
                    phone,
                    oldSessionId: session.id,
                    expiredTime: Date.now() - new Date(session.lastActivity).getTime()
                });

                await this.deleteSessionFromRedis(phone);
                this.sessions.delete(phone);

                return await this.createSession(phone, {
                    data: { userName: session.data.userName },
                    flags: { isFirstTime: false }
                });
            }

            // Update last activity
            session.lastActivity = new Date();

            // Save updated session back to Redis
            await this.saveSessionToRedis(phone, session);
            this.sessions.set(phone, session);

            return session;

        } catch (error) {
            logger.error('Error getting session:', error);

            // Fallback to in-memory session
            return this.getInMemorySession(phone);
        }
    }

    getInMemorySession(phone) {
        const session = this.sessions.get(phone);

        if (!session) {
            return this.createInMemorySession(phone);
        }

        // Check if session is expired
        if (this.isSessionExpired(session)) {
            this.sessions.delete(phone);
            return this.createInMemorySession(phone, {
                data: { userName: session.data.userName },
                flags: { isFirstTime: false }
            });
        }

        session.lastActivity = new Date();
        return session;
    }

    createInMemorySession(phone, initialData = {}) {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            phone,
            startTime: new Date(),
            lastActivity: new Date(),
            status: 'active',
            context: {
                currentFlow: 'welcome',
                previousFlow: null,
                waitingFor: null,
                supabaseConversationId: null,
                ...initialData.context
            },
            data: {
                userName: initialData.userName || null,
                language: initialData.language || 'en',
                timezone: initialData.timezone || 'UTC',
                ...initialData.data
            },
            conversation: {
                messageCount: 0,
                aiInteractions: 0,
                escalationRequested: false,
                escalationReason: null,
                satisfaction: null,
                history: []
            },
            flags: {
                isFirstTime: !this.sessions.has(phone),
                needsOnboarding: true,
                isVip: false,
                isUrgent: false,
                ...initialData.flags
            }
        };

        this.sessions.set(phone, session);
        return session;
    }

    async saveSessionToRedis(phone, session) {
        try {
            // Helper function to safely convert to ISO string
            const toISOString = (dateValue) => {
                if (!dateValue) return null;

                const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

                // Check if date is valid
                if (isNaN(date.getTime())) {
                    logger.warn('Invalid date value detected, using current time', { dateValue });
                    return new Date().toISOString();
                }

                return date.toISOString();
            };

            const sessionData = {
                ...session,
                // Convert dates to ISO strings for JSON serialization
                startTime: toISOString(session.startTime),
                lastActivity: toISOString(session.lastActivity),
                endTime: session.endTime ? toISOString(session.endTime) : null
            };

            await redisService.setUserSession(phone, sessionData);

        } catch (error) {
            logger.error('Error saving session to Redis:', error);
        }
    }

    async loadSessionFromRedis(phone) {
        try {
            const sessionData = await redisService.getUserSession(phone);

            if (!sessionData) return null;

            // Convert ISO strings back to Date objects
            return {
                ...sessionData,
                startTime: new Date(sessionData.startTime),
                lastActivity: new Date(sessionData.lastActivity),
                endTime: sessionData.endTime ? new Date(sessionData.endTime) : null
            };

        } catch (error) {
            logger.error('Error loading session from Redis:', error);
            return null;
        }
    }

    async deleteSessionFromRedis(phone) {
        try {
            await redisService.deleteUserSession(phone);
        } catch (error) {
            logger.error('Error deleting session from Redis:', error);
        }
    }

    async updateSession(phone, updateData) {
        try {
            const session = await this.getSession(phone);

            // Deep merge update data
            for (const [key, value] of Object.entries(updateData)) {
                if (key === 'context' || key === 'data' || key === 'conversation' || key === 'flags') {
                    session[key] = { ...session[key], ...value };
                } else {
                    session[key] = value;
                }
            }

            session.lastActivity = new Date();

            // Save to Redis
            await this.saveSessionToRedis(phone, session);
            this.sessions.set(phone, session);

            logger.info('Session updated with Redis persistence', {
                phone,
                sessionId: session.id,
                updateKeys: Object.keys(updateData)
            });

            return session;
        } catch (error) {
            logger.error('Error updating session:', error);
            return null;
        }
    }

    async addToConversationHistory(phone, message, role = 'user') {
        try {
            const session = await this.getSession(phone);

            if (!session) {
                logger.error('Cannot add to conversation history - session is null', { phone });
                return null;
            }

            // Ensure conversation structure exists
            if (!session.conversation) {
                session.conversation = {
                    messageCount: 0,
                    aiInteractions: 0,
                    escalationRequested: false,
                    escalationReason: null,
                    satisfaction: null,
                    history: []
                };
            }

            if (!session.conversation.history) {
                session.conversation.history = [];
            }

            const historyEntry = {
                role,
                content: message,
                timestamp: new Date(),
                messageId: this.generateMessageId()
            };

            session.conversation.history.push(historyEntry);
            session.conversation.messageCount++;

            if (role === 'assistant') {
                session.conversation.aiInteractions++;
            }

            // Keep only last 20 messages
            if (session.conversation.history.length > 20) {
                session.conversation.history = session.conversation.history.slice(-20);
            }

            session.lastActivity = new Date();

            // Save to Redis
            await this.saveSessionToRedis(phone, session);
            this.sessions.set(phone, session);

            return historyEntry;
        } catch (error) {
            logger.error('Error adding to conversation history:', error);
            return null;
        }
    }

    async getConversationHistory(phone, limit = 10) {
        try {
            const session = await this.getSession(phone);
            return session.conversation.history.slice(-limit);
        } catch (error) {
            logger.error('Error getting conversation history:', error);
            return [];
        }
    }

    async setContext(phone, contextData) {
        try {
            const session = await this.getSession(phone);
            session.context = { ...session.context, ...contextData };
            session.lastActivity = new Date();

            // Save to Redis
            await this.saveSessionToRedis(phone, session);
            this.sessions.set(phone, session);

            logger.info('Session context updated with Redis persistence', {
                phone,
                sessionId: session.id,
                context: contextData
            });

            return session.context;
        } catch (error) {
            logger.error('Error setting session context:', error);
            return null;
        }
    }

    async getContext(phone) {
        try {
            const session = await this.getSession(phone);
            return session.context;
        } catch (error) {
            logger.error('Error getting session context:', error);
            return {};
        }
    }

    async markAsEscalated(phone, reason) {
        try {
            const session = await this.getSession(phone);
            session.conversation.escalationRequested = true;
            session.conversation.escalationReason = reason;
            session.conversation.escalationTime = new Date();
            session.status = 'escalated';

            session.lastActivity = new Date();

            // Save to Redis
            await this.saveSessionToRedis(phone, session);
            this.sessions.set(phone, session);

            logger.info('Session marked as escalated with Redis persistence', {
                phone,
                sessionId: session.id,
                reason
            });

            return session;
        } catch (error) {
            logger.error('Error marking session as escalated:', error);
            return null;
        }
    }

    async hasExistingSession(phone) {
        try {
            const redisSession = await redisService.getUserSession(phone);
            return !!redisSession || this.sessions.has(phone);
        } catch (error) {
            return this.sessions.has(phone);
        }
    }

    isSessionExpired(session) {
        const lastActivity = session.lastActivity instanceof Date ?
            session.lastActivity : new Date(session.lastActivity);
        return Date.now() - lastActivity.getTime() > this.sessionTimeout;
    }

    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    startCleanup() {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.cleanupInterval);
    }

    async cleanupExpiredSessions() {
        try {
            let cleanedCount = 0;
            const now = Date.now();

            // Cleanup in-memory sessions
            for (const [phone, session] of this.sessions.entries()) {
                const lastActivity = session.lastActivity instanceof Date ?
                    session.lastActivity : new Date(session.lastActivity);

                if (now - lastActivity.getTime() > this.sessionTimeout) {
                    await this.deleteSessionFromRedis(phone);
                    this.sessions.delete(phone);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                logger.info('Expired sessions cleaned up', { cleanedCount });
            }
        } catch (error) {
            logger.error('Error during session cleanup:', error);
        }
    }

    // Additional Redis-specific methods
    async getAllActiveSessions() {
        try {
            const activeUsers = await redisService.getActiveUsers();
            const activeSessions = [];

            for (const phone of activeUsers) {
                const session = await this.loadSessionFromRedis(phone);
                if (session && session.status === 'active') {
                    activeSessions.push(session);
                }
            }

            return activeSessions;
        } catch (error) {
            logger.error('Error getting active sessions from Redis:', error);
            return Array.from(this.sessions.values()).filter(session => session.status === 'active');
        }
    }

    // Health check
    async healthCheck() {
        const redisStatus = redisService.getStatus();
        const memorySessionCount = this.sessions.size;

        return {
            redis: redisStatus,
            memorySessions: memorySessionCount,
            healthy: redisStatus.connected || memorySessionCount >= 0
        };
    }
}

export const redisSessionManager = new RedisSessionManager();