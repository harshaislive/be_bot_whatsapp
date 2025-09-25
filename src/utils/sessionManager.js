import { logger } from './logger.js';

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes

        // Start periodic cleanup
        this.startCleanup();
    }

    createSession(phone, initialData = {}) {
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
                    isFirstTime: !this.hasExistingSession(phone),
                    needsOnboarding: true,
                    isVip: false,
                    isUrgent: false,
                    ...initialData.flags
                }
            };

            this.sessions.set(phone, session);

            logger.info('Session created', {
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

    getSession(phone) {
        const session = this.sessions.get(phone);

        if (!session) {
            return this.createSession(phone);
        }

        // Check if session is expired
        if (this.isSessionExpired(session)) {
            logger.info('Session expired, creating new one', {
                phone,
                oldSessionId: session.id,
                expiredTime: Date.now() - session.lastActivity.getTime()
            });

            this.sessions.delete(phone);
            return this.createSession(phone, {
                data: { userName: session.data.userName },
                flags: { isFirstTime: false }
            });
        }

        // Update last activity
        session.lastActivity = new Date();
        return session;
    }

    updateSession(phone, updateData) {
        try {
            const session = this.getSession(phone);

            // Deep merge update data
            for (const [key, value] of Object.entries(updateData)) {
                if (key === 'context' || key === 'data' || key === 'conversation' || key === 'flags') {
                    session[key] = { ...session[key], ...value };
                } else {
                    session[key] = value;
                }
            }

            session.lastActivity = new Date();
            this.sessions.set(phone, session);

            logger.info('Session updated', {
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

    addToConversationHistory(phone, message, role = 'user') {
        try {
            const session = this.getSession(phone);

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
            this.sessions.set(phone, session);

            return historyEntry;
        } catch (error) {
            logger.error('Error adding to conversation history:', error);
            return null;
        }
    }

    getConversationHistory(phone, limit = 10) {
        try {
            const session = this.getSession(phone);
            return session.conversation.history.slice(-limit);
        } catch (error) {
            logger.error('Error getting conversation history:', error);
            return [];
        }
    }

    setContext(phone, contextData) {
        try {
            const session = this.getSession(phone);
            session.context = { ...session.context, ...contextData };
            session.lastActivity = new Date();
            this.sessions.set(phone, session);

            logger.info('Session context updated', {
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

    getContext(phone) {
        try {
            const session = this.getSession(phone);
            return session.context;
        } catch (error) {
            logger.error('Error getting session context:', error);
            return {};
        }
    }

    markAsEscalated(phone, reason) {
        try {
            const session = this.getSession(phone);
            session.conversation.escalationRequested = true;
            session.conversation.escalationReason = reason;
            session.conversation.escalationTime = new Date();
            session.status = 'escalated';

            session.lastActivity = new Date();
            this.sessions.set(phone, session);

            logger.info('Session marked as escalated', {
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

    setSatisfaction(phone, rating, feedback = null) {
        try {
            const session = this.getSession(phone);
            session.conversation.satisfaction = {
                rating,
                feedback,
                timestamp: new Date()
            };

            session.lastActivity = new Date();
            this.sessions.set(phone, session);

            logger.info('Session satisfaction recorded', {
                phone,
                sessionId: session.id,
                rating
            });

            return session;
        } catch (error) {
            logger.error('Error setting session satisfaction:', error);
            return null;
        }
    }

    endSession(phone, reason = 'completed') {
        try {
            const session = this.sessions.get(phone);
            if (!session) return null;

            session.status = 'ended';
            session.endTime = new Date();
            session.endReason = reason;

            const sessionDuration = session.endTime.getTime() - session.startTime.getTime();

            logger.info('Session ended', {
                phone,
                sessionId: session.id,
                duration: sessionDuration,
                messageCount: session.conversation.messageCount,
                reason
            });

            // Remove from active sessions
            this.sessions.delete(phone);

            return {
                ...session,
                duration: sessionDuration
            };
        } catch (error) {
            logger.error('Error ending session:', error);
            return null;
        }
    }

    getAllActiveSessions() {
        return Array.from(this.sessions.values())
            .filter(session => session.status === 'active');
    }

    getSessionStats() {
        const sessions = Array.from(this.sessions.values());
        const activeSessions = sessions.filter(s => s.status === 'active');
        const escalatedSessions = sessions.filter(s => s.conversation.escalationRequested);

        return {
            total: sessions.length,
            active: activeSessions.length,
            escalated: escalatedSessions.length,
            averageMessageCount: sessions.length > 0 ?
                sessions.reduce((sum, s) => sum + s.conversation.messageCount, 0) / sessions.length : 0,
            totalAiInteractions: sessions.reduce((sum, s) => sum + s.conversation.aiInteractions, 0)
        };
    }

    hasExistingSession(phone) {
        return this.sessions.has(phone);
    }

    isSessionExpired(session) {
        return Date.now() - session.lastActivity.getTime() > this.sessionTimeout;
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

    cleanupExpiredSessions() {
        try {
            let cleanedCount = 0;
            const now = Date.now();

            for (const [phone, session] of this.sessions.entries()) {
                if (now - session.lastActivity.getTime() > this.sessionTimeout) {
                    this.endSession(phone, 'timeout');
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

    // Middleware for flows
    middleware() {
        return async (ctx, next) => {
            try {
                const phone = ctx.from;
                const session = this.getSession(phone);

                // Add session to context
                ctx.session = session;

                // Record message in history
                if (ctx.body) {
                    this.addToConversationHistory(phone, ctx.body, 'user');
                }

                await next();

            } catch (error) {
                logger.error('Session middleware error:', error);
                throw error;
            }
        };
    }
}

export const sessionManager = new SessionManager();